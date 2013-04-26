
CREATE OR REPLACE FUNCTION PolygonWithObstacles(polygon geometry)
RETURNS geometry AS
$$
DECLARE
    obstacle geometry;
    polygontmp geometry;
	result record;
BEGIN
    polygontmp := polygon ;
    FOR obstacle IN SELECT way FROM planet_osm_line WHERE barrier='fence' AND ST_Contains(polygon,way) LOOP
	SELECT * INTO polygontmp FROM ST_Difference(polygontmp,ST_Buffer(obstacle, 0.75, 'endcap=square join=mitre mitre_limit=1.0')) ;
    END LOOP;
RETURN polygontmp;
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION AllSegmentsFromPoints(polygon geometry,osm_id integer)
RETURNS SETOF geometry AS
$$
BEGIN
RETURN QUERY
	EXECUTE
	'WITH poly_geom AS (SELECT way FROM planet_osm_polygon WHERE osm_id=$1),
		points1 AS (SELECT (ST_DumpPoints(poly_geom.way)).* FROM poly_geom),
		points2 AS (SELECT (ST_DumpPoints(poly_geom.way)).* FROM poly_geom)
	SELECT DISTINCT ST_MakeLine(points1.geom, points2.geom)
	FROM points1,points2
	WHERE points1.path <> points2.path;'
	USING osm_id;
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION VisibilityLines(polygon geometry,osm_id integer,line_name text)
RETURNS SETOF geometry AS
$$
DECLARE
    line geometry;
    ninteriorrings integer;
    i integer ;
    validsegment boolean;
BEGIN
    -- n rings for the polygon, n-1 interior rings
    ninteriorrings := ST_NRINGS(polygon)-1;
    -- analyse each line
    FOR line IN SELECT * FROM AllSegmentsFromPoints(polygon,osm_id) LOOP
	-- we assume the line is valid, i.e does not crosses the polygon, and is not included inside an inner ring
	validsegment := TRUE;
	-- check : no line outside the outer ring
	validsegment := validsegment AND ST_covers(ST_BuildArea(ST_ExteriorRing(polygon)),line);
	-- check : no line crosses any ring
	validsegment := validsegment AND NOT (ST_CROSSES(polygon,line));
	-- if there is one or more inner ring, check if the line is inside this ring
	IF ninteriorrings > 0 THEN
	    FOR i IN 1..ninteriorrings LOOP
	         validsegment := validsegment AND NOT ST_within(line,ST_BuildArea(ST_InteriorRingN(polygon,i)));
	    END LOOP;
	END IF;
	-- if the line is valid, return it
	IF validsegment
	THEN
	    --RETURN NEXT line;
	    INSERT INTO lines_from_polygon (geom,name,osm_id) VALUES (line,line_name,osm_id);
	END IF;
	END LOOP;
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION PolygonToVisibilityGraph(col text, value text)
RETURNS VOID AS
$$
DECLARE
    polygon record;
BEGIN
FOR polygon IN SELECT way,osm_id,name FROM planet_osm_polygon WHERE col=value LOOP
	PERFORM VisibilityLines(PolygonWithObstacles(polygon.way),polygon.osm_id,polygon.name);
END LOOP;
END;
$$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION PolygonToVisibilityGraphHighway(value text)
RETURNS VOID AS
$$
DECLARE
    polygon record;
BEGIN
FOR polygon IN SELECT way,osm_id,name FROM planet_osm_polygon WHERE highway=quote_ident(value) LOOP
	PERFORM VisibilityLines(PolygonWithObstacles(polygon.way),polygon.osm_id,polygon.name);
END LOOP;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION PolygonToVisibilityGraphAmenity(value text)
RETURNS VOID AS
$$
DECLARE
    polygon record;
BEGIN
FOR polygon IN SELECT way,osm_id,name FROM planet_osm_polygon WHERE amenity=value LOOP
	PERFORM VisibilityLines(PolygonWithObstacles(polygon.way),polygon.osm_id,polygon.name);
END LOOP;
END;
$$
LANGUAGE plpgsql;


-- base gis
CREATE TABLE lines_from_polygon
(
  geom geometry(Geometry,900913),
  name text,
  osm_id integer
)

SELECT PolygonToVisibilityGraph();


-- base routing

-- VERSION BON ORDRE - linestring

CREATE OR REPLACE FUNCTION ShortestPathGeojsonLinestring(startp integer,stopp integer)
RETURNS text AS
$$
DECLARE
	geojson text;
	point record;
	linegeom record;
	i integer;
	pvid integer;
	point_length double precision;
	length_tot double precision;
BEGIN
	i:=1;
	length_tot:=0;
	length_tot:=0;
	geojson:='{"type":"FeatureCollection","features":[';
	FOR point IN (SELECT * FROM shortest_path('
                SELECT gid as id,
                         source::integer,
                         target::integer,
                         length*3::double precision as cost
                        FROM ways WHERE foot IS NOT FALSE', startp, stopp, false, false) WHERE edge_id>0) LOOP
		pvid:=point.edge_id;
		SELECT length INTO point_length FROM ways WHERE ways.gid=pvid;
		length_tot:=length_tot + point_length;
		geojson:=geojson || '{"type":"Feature","geometry":';
		FOR linegeom IN (SELECT ST_AsGeoJSON(ways.the_geom) FROM ways WHERE ways.gid=pvid) LOOP
			geojson:=geojson || linegeom.st_asgeojson;
		END LOOP;
		geojson:=geojson || ', "properties":{"id":';
		geojson:=geojson || i;
		geojson:=geojson || '}},';
		i:=i+1;
	END LOOP;
	geojson:=substring(geojson from 1 for char_length(geojson)-1);	
	geojson:=geojson || '],"properties": {"length":' || length_tot || '}';
	geojson:=geojson || '}';
	RETURN geojson;
END;
$$
LANGUAGE plpgsql;


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
								FROM (SELECT * FROM ways WHERE foot IS NOT FALSE) as ways_foot
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
	geojson:=geojson || '],"properties": {"length":' || length_tot || '}';
	geojson:=geojson || '}';
	RETURN geojson;
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION NearestVertex(lat text,lon text)
RETURNS integer AS
$$
DECLARE
	idresult integer;
BEGIN
	SELECT id
	INTO idresult
	FROM vertices_tmp
	ORDER BY the_geom <-> ST_GeomFromText('POINT(' || lon || ' ' || lat || ')',4326)
	LIMIT 1;
	RETURN idresult;
END;
$$
LANGUAGE plpgsql;


CREATE TABLE ways_openspace
(
  geom geometry(LineString,4326),
  id integer,
  source integer,
  target integer
)

--postgresql contrib doit être installé
CREATE EXTENSION dblink;

CREATE SEQUENCE ways_openspace_id;

WITH nummax AS (SELECT max(gid) FROM ways)
SELECT setval('ways_openspace_id', ((SELECT * FROM nummax)+1));

ALTER TABLE ways ADD COLUMN foot boolean;

INSERT INTO ways(the_geom,name,class_id,gid,osm_id,foot)
SELECT lines_openspace,lines_name,116,nextval('ways_openspace_id'),lines_osm_id,TRUE
FROM dblink('dbname=gis user=postgres password=corpus',
            'select st_transform(geom,4326),name,osm_id from lines_from_polygon')
       AS t1(lines_openspace geometry,lines_name text,lines_osm_id integer);


SELECT assign_vertex_id('ways', 0.00001, 'the_geom', 'gid');

UPDATE ways SET length = ST_Length_Spheroid(ways.the_geom,'SPHEROID["WGS 84",6378137,298.257223563]');



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
		SELECT foot_gis,access_gis INTO line_attr
		FROM dblink('dbname=gis user=postgres password=corpus',
            'select foot,access from planet_osm_line WHERE osm_id=' || line_osm_id)
      AS t1(foot_gis text, access_gis text);
      IF (line_attr.foot_gis='yes') OR (line_attr.foot_gis='designated') OR (line_attr.foot_gis='permissive') THEN
		UPDATE ways SET foot=TRUE WHERE gid=line.gid;
	ELSEIF (line_attr.foot_gis='no') OR (line_attr.access_gis='no') OR (line_attr.access_gis='private') THEN
		UPDATE ways SET foot=FALSE WHERE gid=line.gid;
	END IF;
	END LOOP;
END;
$$
LANGUAGE plpgsql;

SELECT UpdateFootAttribute()


CREATE OR REPLACE FUNCTION UpdateSidewalks()
RETURNS VOID AS
$$
DECLARE
    line record;
    buffer geometry;
BEGIN
	FOR line IN SELECT gid,the_geom FROM ways WHERE gid in (SELECT way_id FROM way_tag WHERE class_id = 501) LOOP
		SELECT st_transform(ST_BUFFER((SELECT st_transform(line.the_geom,3857)),20, 'endcap=square'),4326) INTO buffer;
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

SELECT UpdateSidewalks()




-- Ne fonctionne pas
--CREATE OR REPLACE FUNCTION SimplifyVisibilityGraph()
RETURNS VOID AS
$$
DECLARE
	osm_id_polygon integer;
	point integer;
	osm_id_polygon_vertices_reused record;
	edge_id_used record;
BEGIN
-- Loop through the polygons
FOR osm_id_polygon IN SELECT DISTINCT osm_id FROM ways WHERE frompolygon LOOP
	WITH osm_id_polygon_vertices AS (
		SELECT source
		FROM ways
		WHERE osm_id=osm_id_polygon)	
	SELECT source
	INTO osm_id_polygon_vertices_reused
	FROM osm_id_polygon_vertices 
	WHERE ((source IN (SELECT source FROM ways WHERE osm_id != osm_id_polygon))
	OR (source IN (SELECT target FROM ways WHERE osm_id != osm_id_polygon)))
	AND source IS NOT NULL;

	
	UPDATE ways
	SET foot=FALSE
	WHERE osm_id=osm_id_polygon 
	AND (gid NOT IN (SELECT DISTINCT edge_id
			FROM shortest_path('
				SELECT gid as id,
					source::integer,
					target::integer,
					length::double precision as cost
				FROM ways
				WHERE foot IS NOT FALSE',osm_id_polygon_vertices_reused.source,osm_id_polygon_vertices_reused.source, false, false)
			WHERE edge_id>0));
	
END LOOP;
END;
$$
LANGUAGE plpgsql;


