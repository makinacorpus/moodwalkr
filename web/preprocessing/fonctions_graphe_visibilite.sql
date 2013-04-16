
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
	SELECT * INTO polygontmp FROM ST_Difference(polygontmp,ST_Buffer(obstacle, 0.3, 'endcap=square join=mitre mitre_limit=1.0')) ;
    END LOOP;
RETURN polygontmp;
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION PointsFromPolygon(polygon geometry,osm_id integer) 
RETURNS SETOF geometry AS
$$
DECLARE
	buffer geometry;
	point geometry;
BEGIN
buffer:=ST_Buffer(polygon, 0.1);
FOR point IN SELECT DISTINCT points.geom FROM ( SELECT (ST_DumpPoints(polygon)).* ) AS points LOOP
	RETURN NEXT point;
END LOOP;
END;
$$
LANGUAGE plpgsql ;


CREATE OR REPLACE FUNCTION AllSegmentsFromPoints(polygon geometry,osm_id integer)
RETURNS SETOF geometry AS
$$
DECLARE
    point1 geometry;
    point2 geometry;
    i integer;
BEGIN
i:=1;
    FOR point1 IN SELECT * FROM PointsFromPolygon(polygon,osm_id) LOOP
	FOR point2 IN SELECT * FROM PointsFromPolygon(polygon,osm_id) OFFSET i LOOP
	RETURN NEXT ST_MakeLine(point1,point2);
 	END LOOP;
    i:= i+1;
    END LOOP;
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
	IF ninteriorrings > 0
	THEN
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

CREATE OR REPLACE FUNCTION PolygonToVisibilityGraph()
RETURNS VOID AS
$$
DECLARE
    polygon record;
BEGIN
FOR polygon IN SELECT way,osm_id,name FROM planet_osm_polygon WHERE highway='pedestrian' LOOP
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

UPDATE ways SET length = St_length(st_transform(ways.the_geom,3857));



CREATE OR REPLACE FUNCTION UpdateFootAttribute()
RETURNS VOID AS
$$
DECLARE
    line record;
    line_foot text;
    line_osm_id integer;
BEGIN
	FOR line IN SELECT gid,osm_id FROM ways WHERE (foot IS NULL) LOOP
		line_osm_id := line.osm_id;
		SELECT foot_gis INTO line_foot
		FROM dblink('dbname=gis user=postgres password=corpus',
            'select foot from planet_osm_line WHERE osm_id=' || line_osm_id)
      AS t1(foot_gis text);
      IF (line_foot='yes') OR (line_foot='designated') OR (line_foot='permissive') THEN
		UPDATE ways SET foot=TRUE WHERE gid=line.gid;
	ELSEIF (line_foot='no') THEN
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
