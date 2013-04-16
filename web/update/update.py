#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys,os
import psycopg2

# path to the osm file
osmPath=sys.argv[1]

# "gis" database connection
connGis = psycopg2.connect("dbname=gis user=postgres")
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

os.system("osm2pgsql -s --style /usr/share/osm2pgsql/default.style -U postgres -d gis " + osmPath)


curGis.execute("CREATE TABLE lines_from_polygon (" +
					"geom geometry(Geometry,900913)," +
					"name text," +
					"osm_id integer);")
					
curGis.execute("SELECT PolygonToVisibilityGraph();")

# close the "gis" database connection
connGis.commit()
curGis.close()
connGis.close()


# "routing" database connection
connRouting = psycopg2.connect("dbname=routing user=postgres")
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

os.system("/home/makina/osm2pgrouting/osm2pgrouting -file " + osmPath + " -conf '/home/makina/pedestrian-routing/web/preprocessing/osm2pgrouting/mapconfig.xml' -host localhost -dbname routing -user postgres -clean")

curRouting.execute("CREATE TABLE ways_openspace (" +
						 "geom geometry(LineString,4326)," +
						 "id integer," +
						 "source integer," +
						 "target integer);")

curRouting.execute("WITH nummax AS (SELECT max(gid) FROM ways)" +
						 "SELECT setval('ways_openspace_id', ((SELECT * FROM nummax)+1));")
						 
curRouting.execute("ALTER TABLE ways ADD COLUMN foot boolean;")

curRouting.execute("INSERT INTO ways(the_geom,name,class_id,gid,osm_id,foot) " +
						 "SELECT lines_openspace,lines_name,116,nextval('ways_openspace_id'),lines_osm_id,TRUE " +
						 "FROM dblink('dbname=gis user=postgres password=corpus', " +
						 "'select st_transform(geom,4326),name,osm_id from lines_from_polygon') " +
						 "AS t1(lines_openspace geometry,lines_name text,lines_osm_id integer);")
						 
curRouting.execute("SELECT assign_vertex_id('ways', 0.00001, 'the_geom', 'gid');")

curRouting.execute("UPDATE ways SET length = St_length(st_transform(ways.the_geom,3857));")

curRouting.execute("SELECT UpdateFootAttribute()")

curRouting.execute("SELECT UpdateSideWalks()")

# close the "routing" database connection
connRouting.commit()
curRouting.close()
connRouting.close()
