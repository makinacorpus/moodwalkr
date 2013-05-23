CREATE OR REPLACE FUNCTION ShortestPathGeojsonLinestring2(lat1 text, lon1 text, lat2 text, lon2 text, profile text)
RETURNS text AS
$$
DECLARE
	geojson text;
	point record;
	linegeom text;
	i integer;
	pvid integer;
	point_length double precision;
	length_tot double precision;
	point_start geometry;
	point_target geometry;
	line_start record;
	line_target record;
	position_start double precision;
	position_target double precision;
BEGIN
	-- Initialize the variables
	i:=1;
	length_tot:=0;
	length_tot:=0;
	SELECT * INTO point_start FROM ST_GeomFromText('POINT(' || lon1 || ' ' || lat1 || ')',4326);
	SELECT * INTO point_target FROM ST_GeomFromText('POINT(' || lon2 || ' ' || lat2 || ')',4326);
	
	-- Get the nearest linestrings from the start and target points
	SELECT gid,length,the_geom,source,target, ST_Length(St_ShortestLine(point_start,ways.the_geom)) as sline
	INTO line_start
	FROM ways
	WHERE foot IS NOT FALSE
	ORDER BY sline ASC
	LIMIT 1;	

	SELECT ST_Line_Locate_Point
	INTO position_start
	FROM ST_Line_Locate_Point(line_start.the_geom,point_start);
	
	SELECT gid,length,the_geom,source,target, ST_Length(St_ShortestLine(point_target,ways.the_geom)) as sline
	INTO line_target
	FROM ways
	WHERE foot IS NOT FALSE
	ORDER BY sline ASC
	LIMIT 1;
		
	SELECT ST_Line_Locate_Point
	INTO position_target
	FROM ST_Line_Locate_Point(line_target.the_geom,point_target);
	
	geojson:='{"type":"FeatureCollection","features":[';
	IF (line_start.gid = line_target.gid) THEN 
		geojson:=geojson || '{"type":"Feature","geometry":';
		geojson:=geojson || ST_AsGeoJSON(ST_Line_Substring(line_start.the_geom,LEAST(position_start,position_target),GREATEST(position_start,position_target)));
		geojson:=geojson || ', "properties":{"id":1}},';
		length_tot:=length_tot + line_start.length * abs(position_target - position_start);

	ELSE
		-- Loop across edges. Last edge_id is -1, and is not taken into account. (n vertices, n-1 edges)
		FOR point IN (SELECT * FROM shortest_path('
                SELECT gid as id,
	                source::integer,
	                target::integer,
	                ' || profile || '::double precision as cost
	                FROM (SELECT * FROM ways WHERE foot IS NOT FALSE AND ways.the_geom && ST_EXPAND(
			          ST_SetSRID(
				        ST_MakeLine(
				             ST_MakePoint(' || lon1 || ', ' || lat1 || '),
				             ST_MakePoint(' || lon2 || ', ' || lat2 || ')
				        ),4326),0.05)) as ways_foot
	                UNION (SELECT -11 as gid,' ||  line_start.source || ' as source, -1 as target, (' || position_start || ' * ' || line_start.length || ') as length)
	                UNION (SELECT -12 as gid, -1 as source,' ||  line_start.target || ' as target, ((1-' || position_start || ') * ' || line_start.length || ') as length)
	                UNION (SELECT -21 as gid,' ||  line_target.source || ' as source, -2 as target, (' || position_target || ' * ' || line_target.length || ') as length)
	                UNION (SELECT -22 as gid, -2 as source,' ||  line_target.target || ' as target, ((1-' || position_target || ') * ' || line_target.length || ') as length)
	                ', -1, -2, false, false) WHERE edge_id != -1) LOOP
			pvid:=point.edge_id;
			SELECT length 
			INTO point_length 
			FROM ((SELECT gid,length FROM ways) UNION
			     (SELECT -11 as gid, ( position_start * line_start.length ) as length) UNION
			     (SELECT -12 as gid, ((1- position_start ) * line_start.length ) as length) UNION
			     (SELECT -21 as gid, ( position_target * line_target.length ) as length) UNION
			     (SELECT -22 as gid, ((1- position_target ) * line_target.length ) as length)) as ways_foot
			WHERE ways_foot.gid=pvid;
			
			length_tot:=length_tot + point_length;
			geojson:=geojson || '{"type":"Feature","geometry":';

			SELECT ST_AsGeoJSON(ways_foot.the_geom)
			INTO linegeom
			FROM (SELECT gid, the_geom FROM ways UNION
			     SELECT -11 as gid, ST_Line_Substring(line_start.the_geom,0,position_start) AS the_geom UNION
			     SELECT -12 as gid, ST_Line_Substring(line_start.the_geom,position_start,1) AS the_geom UNION
			     SELECT -21 as gid, ST_Line_Substring(line_target.the_geom,0,position_target) AS the_geom UNION
			     SELECT -22 as gid, ST_Line_Substring(line_target.the_geom,position_target,1) AS the_geom) as ways_foot
			WHERE ways_foot.gid=pvid;

			geojson:=geojson || linegeom;
			geojson:=geojson || ', "properties":{"id":';
			geojson:=geojson || i;
			geojson:=geojson || '}},';
			i:=i+1;
		END LOOP;
	END IF;
	geojson:=substring(geojson from 1 for char_length(geojson)-1);	
	geojson:=geojson || '],"properties": {"length":' || length_tot || ',"profile":"' || profile ||  '"}';
	geojson:=geojson || '}';
	RETURN geojson;
END;
$$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION UpdateFootAttribute()
RETURNS VOID AS
$$
DECLARE
    line record;
    line_attr record ;
    line_osm_id integer;
BEGIN
	FOR line IN SELECT gid,osm_id FROM ways WHERE (foot IS NULL) LOOP
		line_osm_id := line.osm_id;
		SELECT p.foot_gis,p.access_gis INTO line_attr
		FROM (SELECT foot AS foot_gis,access AS access_gis FROM planet_osm_line WHERE osm_id=line_osm_id) AS p;
	IF (line_attr.foot_gis='no') OR (line_attr.access_gis='no') OR (line_attr.access_gis='private') THEN
		UPDATE ways SET foot=FALSE WHERE gid=line.gid;
	ELSEIF (line_attr.foot_gis='yes') OR (line_attr.foot_gis='designated') OR (line_attr.foot_gis='permissive') THEN
		UPDATE ways SET foot=TRUE WHERE gid=line.gid;
	END IF;
	END LOOP;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION UpdateSidewalks()
RETURNS VOID AS
$$
DECLARE
    line record;
    buffer geometry;
BEGIN
	FOR line IN SELECT gid,the_geom FROM ways WHERE gid in (SELECT way_id FROM way_tag WHERE class_id = 501) LOOP
		SELECT st_transform(ST_BUFFER((SELECT st_transform(line.the_geom,3857)),15, 'endcap=square'),4326) INTO buffer;
		UPDATE ways SET foot=FALSE WHERE ST_Contains(buffer,ways.the_geom) AND 
		(ways.class_id !=115) AND 
		(ways.class_id !=116) AND 
		(ways.class_id !=119) AND 
		(ways.class_id !=120) AND 
		(ways.class_id !=121) AND 
		(ways.class_id !=122) AND 
		(ways.class_id !=123) AND 
		(ways.class_id !=124);
	END LOOP;
END;
$$
LANGUAGE plpgsql;

DO LANGUAGE plpgsql $$
BEGIN
    IF NOT EXISTS (SELECT 0 FROM pg_class where relname='ways_openspace_id')
    THEN
        CREATE SEQUENCE ways_openspace_id;
    END IF;
END
$$;

