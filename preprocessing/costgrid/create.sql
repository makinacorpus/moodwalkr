--bas gis

CREATE TABLE cost_grid
(
  geom geometry(Geometry,900913),
  X integer,
  Y integer
)

INSERT INTO cost_grid (geom)
SELECT ST_Transform(ST_geomfromtext('POLYGON(('||X||' '||Y||', '||(X+50)||' '||Y||', '||(X+50)||' '||(Y+50)||', '||X||' '||(Y+50)||', '||X||' '||Y||'))',3035),900913)
	FROM generate_series(3621600,3637600,50) as X,
	generate_series(2307400,2325000,50) as Y;

CREATE INDEX cost_grid_geom_idx ON cost_grid USING gist(geom);

-- Environment : water

ALTER TABLE cost_grid ADD COLUMN e_water integer DEFAULT 0;

UPDATE cost_grid
SET e_water=1
FROM (SELECT way,waterway FROM planet_osm_polygon WHERE waterway='riverbank') as riverbank
WHERE ST_Intersects(cost_grid.geom,riverbank.way);

UPDATE cost_grid
SET e_water=1
FROM (SELECT way,waterway FROM planet_osm_line WHERE waterway='riverbank') as riverbank
WHERE ST_Intersects(cost_grid.geom,riverbank.way);

-- Environment : parks

ALTER TABLE cost_grid ADD COLUMN e_park integer DEFAULT 0;

UPDATE cost_grid
SET e_park=1
FROM (SELECT way,leisure FROM planet_osm_polygon WHERE leisure='park') as park
WHERE ST_Intersects(cost_grid.geom,park.way);

-- Transport - bus stops

ALTER TABLE cost_grid ADD COLUMN t_bus float DEFAULT 0;

UPDATE cost_grid
SET t_bus=( SELECT count(*)
	    FROM (SELECT way,highway FROM planet_osm_point WHERE highway='bus_stop') as bus_stop
	    WHERE ST_Contains(cost_grid.geom,bus_stop.way));

WITH max_t_bus AS (SELECT max(t_bus) FROM cost_grid)
UPDATE cost_grid
SET t_bus=(t_bus/(SELECT max FROM max_t_bus));

-- Transport - bicycle rental

ALTER TABLE cost_grid ADD COLUMN t_bicycle_rental float DEFAULT 0;

UPDATE cost_grid
SET t_bicycle_rental=( SELECT count(*)
	    FROM (SELECT way,amenity FROM planet_osm_point WHERE amenity='bicycle_rental') as bicycle_rental
	    WHERE ST_Contains(cost_grid.geom,bicycle_rental.way));


WITH max_t_bicycle_rental AS (SELECT max(t_bicycle_rental) FROM cost_grid)
UPDATE cost_grid
SET t_bicycle_rental=(t_bicycle_rental/(SELECT max FROM max_t_bicycle_rental));

-- Transport - Subway and tram

ALTER TABLE cost_grid ADD COLUMN t_heavy_transport float DEFAULT 0;

UPDATE cost_grid
SET t_heavy_transport=( SELECT count(*)
	    FROM (SELECT way,railway FROM planet_osm_point WHERE railway='station' OR railway='tram_stop') as heavy_transport
	    WHERE ST_Contains(cost_grid.geom,heavy_transport.way));


WITH max_t_heavy_transport AS (SELECT max(t_heavy_transport) FROM cost_grid)
UPDATE cost_grid
SET t_heavy_transport=(t_heavy_transport/(SELECT max FROM max_t_heavy_transport));

-- Activity - shops

ALTER TABLE cost_grid ADD COLUMN a_shops float DEFAULT 0;

UPDATE cost_grid
SET a_shops=(SELECT count(*)
	     FROM (SELECT way,shop FROM planet_osm_point WHERE shop LIKE '%') as shops
	     WHERE ST_Contains(cost_grid.geom,shops.way)
	    )
;

UPDATE cost_grid
SET a_shops=a_shops+(SELECT count(*)
	     FROM (SELECT way,shop FROM planet_osm_polygon WHERE shop LIKE '%') as shops
	     WHERE ST_Intersects(cost_grid.geom,shops.way)
	    )
;

WITH max_a_shops AS (SELECT max(a_shops) FROM cost_grid)
UPDATE cost_grid
SET a_shops=(a_shops/(SELECT max FROM max_a_shops));

-- Activity - leisure

ALTER TABLE cost_grid ADD COLUMN a_leisure float DEFAULT 0;

UPDATE cost_grid
SET a_leisure=(SELECT count(*)
	     FROM (SELECT way,leisure FROM planet_osm_point WHERE leisure LIKE '%' AND leisure != 'park') as leisure
	     WHERE ST_Contains(cost_grid.geom,leisure.way)
	    )
;

UPDATE cost_grid
SET a_leisure=a_leisure+(SELECT count(*)
	     FROM (SELECT way,leisure FROM planet_osm_polygon WHERE leisure LIKE '%' AND leisure != 'park') as leisure
	     WHERE ST_Intersects(cost_grid.geom,leisure.way)
	    )
;

WITH max_a_leisure AS (SELECT max(a_leisure) FROM cost_grid)
UPDATE cost_grid
SET a_leisure=(a_leisure/(SELECT max FROM max_a_leisure));

-- Activity - public buidings

ALTER TABLE cost_grid ADD COLUMN a_public_building float DEFAULT 0;

UPDATE cost_grid
SET a_public_building=(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_point WHERE amenity='townhall' OR amenity='police' OR amenity='hospital' OR amenity='school' OR amenity='university' OR amenity='college') as public_building
	     WHERE ST_Contains(cost_grid.geom,public_building.way)
	    )
;

UPDATE cost_grid
SET a_public_building=a_public_building+(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_polygon WHERE amenity='townhall' OR amenity='police' OR amenity='hospital' OR amenity='school' OR amenity='university' OR amenity='college') as public_building
	     WHERE ST_Intersects(cost_grid.geom,public_building.way)
	    )
;

WITH max_a_public_building AS (SELECT max(a_public_building) FROM cost_grid)
UPDATE cost_grid
SET a_public_building=(a_public_building/(SELECT max FROM max_a_public_building));

-- Culture - tourism

ALTER TABLE cost_grid ADD COLUMN c_tourism float DEFAULT 0;

UPDATE cost_grid
SET c_tourism=(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_point WHERE tourism LIKE '%') as tourism
	     WHERE ST_Contains(cost_grid.geom,tourism.way)
	    )
;

UPDATE cost_grid
SET c_tourism=c_tourism+(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_polygon WHERE tourism LIKE '%') as tourism
	     WHERE ST_Intersects(cost_grid.geom,tourism.way)
	    )
;

WITH max_c_tourism AS (SELECT max(c_tourism) FROM cost_grid)
UPDATE cost_grid
SET c_tourism=(c_tourism/(SELECT max FROM max_c_tourism));

-- Culture - place of worship

ALTER TABLE cost_grid ADD COLUMN c_pow float DEFAULT 0;

UPDATE cost_grid
SET c_pow=(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_point WHERE amenity='place_of_worship') as pow
	     WHERE ST_Contains(cost_grid.geom,pow.way)
	    )
;

UPDATE cost_grid
SET c_pow=c_pow+(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_polygon WHERE amenity='place_of_worship') as pow
	     WHERE ST_Intersects(cost_grid.geom,pow.way)
	    )
;

WITH max_c_pow AS (SELECT max(c_pow) FROM cost_grid)
UPDATE cost_grid
SET c_pow=(c_pow/(SELECT max FROM max_c_pow));
