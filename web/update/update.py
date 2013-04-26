#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys,os
import psycopg2
import config

# path to the osm file
osmPath=sys.argv[1]

# "gis" database connection
connGis = psycopg2.connect("dbname=gis user=postgres")
connGis.autocommit = True
curGis = connGis.cursor()

# Drop existing tables
curGis.execute("DROP TABLE IF EXISTS lines_from_polygon")
# curGis.execute("DELETE FROM planet_osm_line")
# curGis.execute("DELETE FROM planet_osm_nodes")
# curGis.execute("DELETE FROM planet_osm_point")
# curGis.execute("DELETE FROM planet_osm_polygon")
# curGis.execute("DELETE FROM planet_osm_rels")
# curGis.execute("DELETE FROM planet_osm_roads")
# curGis.execute("DELETE FROM planet_osm_ways")

print "***** osm2pgsql"
os.system("osm2pgsql -s --style /usr/share/osm2pgsql/default.style -U postgres -d gis " + osmPath)


curGis.execute("CREATE TABLE lines_from_polygon (" +
					"geom geometry(Geometry,900913)," +
					"name text," +
					"osm_id integer);")

print "***** Visibility graphs creation"
for zone in config.pedestrianAreasHighway:		
	curGis.execute('SELECT PolygonToVisibilityGraphHighway(%s)',(zone,))

#for zone in config.pedestrianAreasAmenity:		
#	curGis.execute('SELECT PolygonToVisibilityGraphAmenity(%s)',(zone,))

# close the "gis" database connection
connGis.commit()
curGis.close()
connGis.close()


# "routing" database connection
connRouting = psycopg2.connect("dbname=routing user=postgres")
connRouting.autocommit = True
curRouting = connRouting.cursor()

# Drop existing tables
# curRouting.execute("DELETE FROM classes")
# curRouting.execute("DELETE FROM nodes")
# curRouting.execute("DELETE FROM relation_ways")
# curRouting.execute("DELETE FROM relations")
# curRouting.execute("DELETE FROM types")
# curRouting.execute("DELETE FROM vertices_tmp")
# curRouting.execute("DELETE FROM way_tag")
# curRouting.execute("DELETE FROM ways")
curRouting.execute("DROP TABLE IF EXISTS ways_openspace")

print "***** osm2pgrouting"
os.system("/home/makina/osm2pgrouting/osm2pgrouting -file " + osmPath + " -conf '/home/makina/pedestrian-routing/preprocessing/osm2pgrouting/mapconfig.xml' -host localhost -dbname routing -user postgres -clean")

curRouting.execute("CREATE TABLE ways_openspace (" +
						 "geom geometry(LineString,4326)," +
						 "id integer," +
						 "source integer," +
						 "target integer);")

curRouting.execute("WITH nummax AS (SELECT max(gid) FROM ways)" +
						 "SELECT setval('ways_openspace_id', ((SELECT * FROM nummax)+1));")
						 
curRouting.execute("ALTER TABLE ways ADD COLUMN foot boolean;")
curRouting.execute("ALTER TABLE ways ADD COLUMN frompolygon boolean;")
curRouting.execute("ALTER TABLE ways ADD COLUMN cost_activity float;")
curRouting.execute("ALTER TABLE ways ADD COLUMN cost_nature float;")

print "***** Import ways from polygon"
curRouting.execute("INSERT INTO ways(the_geom,name,class_id,gid,osm_id,foot,frompolygon) " +
						 "SELECT lines_openspace,lines_name,116,nextval('ways_openspace_id'),lines_osm_id,TRUE,TRUE " +
						 "FROM dblink('dbname=gis user=postgres password=corpus', " +
						 "'select st_transform(geom,4326),name,osm_id from lines_from_polygon') " +
						 "AS t1(lines_openspace geometry,lines_name text,lines_osm_id integer);")

print "***** Assign vertex id"
curRouting.execute("SELECT assign_vertex_id('ways', 0.00001, 'the_geom', 'gid');")

print "***** Update legnth"
curRouting.execute("UPDATE ways SET length = ST_Length_Spheroid(ways.the_geom,'SPHEROID[\"WGS 84\",6378137,298.257223563]');")

print "***** Update foot attribute"
curRouting.execute("SELECT UpdateFootAttribute()")

print "***** Update sidewalks"
curRouting.execute("SELECT UpdateSideWalks()")

print "***** Create index geom on ways"
curRouting.execute("CREATE INDEX ways_geom_idx ON ways USING gist(the_geom);")

print "***** Update cost_activity"
curRouting.execute("UPDATE ways " +
						 "SET cost_activity = length * (1 - cinter.activity/2) " +
						 "FROM ( " +
						 "	SELECT w.gid as id, avg(c.test_activite) as activity " +
						 "	FROM dblink('dbname=gis user=postgres password=corpus', " +
						 "	'SELECT test_activite, ST_Transform(geom,4326) FROM cost_grid') " +
						 "	AS c(test_activite float, geom geometry), ways AS w " +
						 "	WHERE ST_Intersects(c.geom,w.the_geom) " +
						 "	GROUP BY w.gid " +
						 "	) AS cinter " +
						 "WHERE cinter.id = ways.gid")
						 
curRouting.execute("UPDATE ways " +
						 "SET cost_activity = length " +
						 "WHERE cost_activity IS NULL;")
						 
print "***** Update cost_nature"						 				 
curRouting.execute("UPDATE ways " +
						 "SET cost_nature = length * (1 - cinter.nature/2) " +
						 "FROM ( " +
						 "	SELECT w.gid as id, avg(c.test_nature) as nature " +
						 "	FROM dblink('dbname=gis user=postgres password=corpus', " +
						 "	'SELECT test_nature, ST_Transform(geom,4326) FROM cost_grid') " +
						 "	AS c(test_nature float, geom geometry), ways AS w " +
						 "	WHERE ST_Intersects(c.geom,w.the_geom) " +
						 "	GROUP BY w.gid " +
						 "	) AS cinter " +
						 "WHERE cinter.id = ways.gid")

curRouting.execute("UPDATE ways " +
						 "SET cost_nature = length " +
						 "WHERE cost_nature IS NULL;")

# close the "routing" database connection
connRouting.commit()
curRouting.close()
connRouting.close()
