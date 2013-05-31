CREATE OR REPLACE FUNCTION PolygonWithObstacles(polygon geometry)
RETURNS geometry AS
$$
DECLARE
    obstacle geometry;
    polygontmp geometry;
	result record;
BEGIN
    polygontmp := SimplifyPolygon(polygon) ;
    FOR obstacle IN SELECT way FROM planet_osm_line WHERE barrier='fence' AND ST_Contains(polygon,way) LOOP
	SELECT * INTO polygontmp FROM ST_Difference(polygontmp,ST_Buffer(obstacle, 0.75, 'endcap=square join=mitre mitre_limit=1.0')) ;
    END LOOP;
RETURN polygontmp;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION SimplifyPolygon(polygon geometry)
RETURNS geometry AS
$$
DECLARE
    linetmp geometry;
BEGIN
	SELECT ST_AddPoint(St_Makeline(geom),ST_PointN(St_Makeline(geom),1))
	INTO linetmp
	FROM (
		SELECT geom
		FROM (
		  SELECT (ST_DumpPoints(polygon)).*
		  ) AS j
		WHERE ST_Contains((SELECT ST_ConvexHull(polygon)::geometry),geom)
		   OR (SELECT count(*) >0
		       FROM (SELECT way,highway,area 
			     FROM planet_osm_line
			     WHERE (highway LIKE '%')
			       AND (area IS NULL)
			       AND (ST_DWithin(way,geom,0.00001))
			    ) AS sj
		      )
	     ) k;
	IF (SELECT count(*) FROM ST_Dumppoints(linetmp) AS countpoints)>3
	    THEN RETURN ST_SetSRID(ST_Makepolygon(linetmp),900913);
	    ELSE RETURN polygon;
	END IF;
END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION AllSegmentsFromPoints(polygon geometry)
RETURNS SETOF geometry AS
$$
BEGIN
RETURN QUERY
	EXECUTE
	'WITH points1 AS (SELECT (ST_DumpPoints($1)).* ),
		points2 AS (SELECT (ST_DumpPoints($1)).* )
	SELECT DISTINCT ST_MakeLine(points1.geom, points2.geom)
	FROM points1,points2
	WHERE points1.path <> points2.path;'
	USING polygon;
END;
$$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION VisibilityLines(polygon geometry,osm_id bigint,line_name text)
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
    FOR line IN SELECT * FROM AllSegmentsFromPoints(polygon) LOOP
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

