-- Environment : water

UPDATE cost_grid
SET e_water=1
FROM (SELECT way,waterway FROM planet_osm_polygon WHERE waterway='riverbank') as riverbank
WHERE ST_Intersects(cost_grid.geom,riverbank.way);

UPDATE cost_grid
SET e_water=1
FROM (SELECT way,waterway FROM planet_osm_line WHERE waterway='riverbank') as riverbank
WHERE ST_Intersects(cost_grid.geom,riverbank.way);

-- Environment : parks

UPDATE cost_grid
SET e_park=1
FROM (SELECT way,leisure FROM planet_osm_polygon WHERE leisure='park') as park
WHERE ST_Intersects(cost_grid.geom,park.way);

-- Environment - natural features

UPDATE cost_grid
SET e_natural=1
FROM (SELECT way,"natural" FROM planet_osm_polygon WHERE "natural" LIKE '%') as naturalf
WHERE ST_Intersects(cost_grid.geom,naturalf.way);

-- Transport - bus stops

UPDATE cost_grid
SET t_bus=( SELECT count(*)
	    FROM (SELECT way,highway FROM planet_osm_point WHERE highway='bus_stop') as bus_stop
	    WHERE ST_Contains(cost_grid.geom,bus_stop.way));

WITH max_t_bus AS (SELECT max(t_bus) FROM cost_grid)
UPDATE cost_grid
SET t_bus=(t_bus/(SELECT max FROM max_t_bus));

-- Transport - bicycle rental

UPDATE cost_grid
SET t_bicycle_rental=( SELECT count(*)
	    FROM (SELECT way,amenity FROM planet_osm_point WHERE amenity='bicycle_rental') as bicycle_rental
	    WHERE ST_Contains(cost_grid.geom,bicycle_rental.way));


WITH max_t_bicycle_rental AS (SELECT GREATEST(max(t_bicycle_rental), 1) as max FROM cost_grid)
UPDATE cost_grid
SET t_bicycle_rental=(t_bicycle_rental/(SELECT max FROM max_t_bicycle_rental));

-- Transport - Subway and tram

UPDATE cost_grid
SET t_heavy_transport=( SELECT count(*)
	    FROM (SELECT way,railway FROM planet_osm_point WHERE railway='station' OR railway='tram_stop') as heavy_transport
	    WHERE ST_Contains(cost_grid.geom,heavy_transport.way));


WITH max_t_heavy_transport AS (SELECT GREATEST(max(t_heavy_transport), 1) as max FROM cost_grid)
UPDATE cost_grid
SET t_heavy_transport=(t_heavy_transport/(SELECT max FROM max_t_heavy_transport));

-- Transport - Highway classification

UPDATE cost_grid
SET t_highway=(SELECT avg(rating)
	     FROM (SELECT way,highway,
			  CASE WHEN highway='motorway' THEN 0
			       WHEN highway='motorway_link' THEN 0
			       WHEN highway='motorway_junction' THEN 0
			       WHEN highway='trunk' THEN 0
			       WHEN highway='trunk_link' THEN 0
			       WHEN highway='primary' THEN 0.1
			       WHEN highway='primary_link' THEN 0.1
			       WHEN highway='secondary' THEN 0.2
			       WHEN highway='secondary_link' THEN 0.2
			       WHEN highway='tertiary' THEN 0.4
			       WHEN highway='tertiary_link' THEN 0.4
			       WHEN highway='unclassified' THEN 0.6
			       WHEN highway='residential' THEN 0.7
			       WHEN highway='bus_guideway' THEN 0.8
			       WHEN highway='service' THEN 0.8
			       WHEN highway='living_street' THEN 0.8
			       WHEN highway='track' THEN 0.9
			       WHEN highway='path' THEN 0.9
			       WHEN highway='steps' THEN 0.9
			       WHEN highway='cycleway' THEN 0.9
			       WHEN highway='bridleway' THEN 1
			       WHEN highway='byway' THEN 1
			       WHEN highway='footway' THEN 1
			       WHEN highway='path' THEN 1
			       WHEN highway='pedestrian' THEN 1
			       ELSE 0
			  END AS rating
	           FROM planet_osm_line WHERE highway LIKE '%') as road
	     WHERE ST_Intersects(cost_grid.geom,road.way)
	    )
;

UPDATE cost_grid
SET t_highway=1
WHERE t_highway IS NULL;

-- Activity - shops

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

WITH max_a_shops AS (SELECT GREATEST(max(a_shops), 1) as max FROM cost_grid)
UPDATE cost_grid
SET a_shops=(a_shops/(SELECT max FROM max_a_shops));

-- Activity - leisure

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

WITH max_a_leisure AS (SELECT GREATEST(max(a_leisure), 1) as max FROM cost_grid)
UPDATE cost_grid
SET a_leisure=(a_leisure/(SELECT max FROM max_a_leisure));

-- Activity - public buidings

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

WITH max_a_public_building AS (SELECT GREATEST(max(a_public_building), 1) as max FROM cost_grid)
UPDATE cost_grid
SET a_public_building=(a_public_building/(SELECT max FROM max_a_public_building));

-- Activity - restaurants and pubs

UPDATE cost_grid
SET a_food=(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_point WHERE amenity='bar' OR amenity='bbq' OR amenity='biergarten' OR amenity='cafe' OR amenity='fast_food' OR amenity='ice_cream' OR amenity='pub' OR amenity='restaurant') as food
	     WHERE ST_Contains(cost_grid.geom,food.way)
	    )
;

UPDATE cost_grid
SET a_food=a_food+(SELECT count(*)
	     FROM (SELECT way,amenity FROM planet_osm_polygon WHERE amenity='bar' OR amenity='bbq' OR amenity='biergarten' OR amenity='cafe' OR amenity='fast_food' OR amenity='ice_cream' OR amenity='pub' OR amenity='restaurant') as food
	     WHERE ST_Intersects(cost_grid.geom,food.way)
	    )
;

WITH max_a_food AS (SELECT GREATEST(max(a_food), 1) as max FROM cost_grid)
UPDATE cost_grid
SET a_food=(a_food/(SELECT max FROM max_a_food));

-- Culture - tourism

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

WITH max_c_tourism AS (SELECT GREATEST(max(c_tourism), 1) as max FROM cost_grid)
UPDATE cost_grid
SET c_tourism=(c_tourism/(SELECT max FROM max_c_tourism));

-- Culture - place of worship

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

WITH max_c_pow AS (SELECT GREATEST(max(c_pow), 1) as max FROM cost_grid)
UPDATE cost_grid
SET c_pow=(c_pow/(SELECT max FROM max_c_pow));



UPDATE cost_grid
   SET test_activite=t_highway+t_heavy_transport+a_shops+a_leisure+c_tourism+c_pow+a_food;

WITH max_test_activite AS (SELECT GREATEST(max(test_activite), 1) as max FROM cost_grid)
UPDATE cost_grid
SET test_activite=(test_activite/(SELECT max FROM max_test_activite));

UPDATE cost_grid
   SET test_nature=t_highway+e_water+e_park+e_natural;

WITH max_test_nature AS (SELECT GREATEST(max(test_nature), 1) as max FROM cost_grid)
UPDATE cost_grid
SET test_nature=(test_nature/(SELECT max FROM max_test_nature));
