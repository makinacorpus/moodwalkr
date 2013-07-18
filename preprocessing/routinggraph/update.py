#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys,os
import psycopg2
from config import *
import requests
import tempfile

# options parsing
costgrid_update = '-c' in sys.argv
use_extract = '-e' in sys.argv
base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# "gis" database connection
conn = psycopg2.connect("dbname=%s user=%s host=localhost password=%s" % (db_name, db_user, db_pass))
conn.autocommit = True
cur = conn.cursor()

# Drop existing tables
cur.execute("DROP TABLE IF EXISTS lines_from_polygon")

# Download data or use a local file defined in config.py
print "***** osm2pgsql"
if use_extract:
	command = "osm2pgsql -s -W -H localhost -U %s -d %s -S %s/preprocessing/osm2pgsql/default.style %s" % (db_user, db_name, base_path, osm_extract)
else:
	print "***** download OSM data"
	r = requests.get("http://www.overpass-api.de/api/xapi?map?bbox=%s,%s,%s,%s" % (lon_inf, lat_inf,lon_sup, lat_sup), stream=True)
	f = tempfile.NamedTemporaryFile(delete=False)
	for data in r.iter_content(chunk_size=1024):
	    f.write(data)
	f.flush()	
	command = "osm2pgsql -s -W -H localhost -U %s -d %s -S %s/preprocessing/osm2pgsql/default.style %s" % (db_user, db_name, base_path, f.name)
print command
os.system(command)

cur.execute("CREATE TABLE lines_from_polygon (" +
			"geom geometry(Geometry,900913)," +
			"name text," +
			"osm_id integer);")

if costgrid_update:
    print "***** create cost grid"
    cur.execute("TRUNCATE cost_grid;")
    cur.execute("WITH pointi AS (SELECT ST_Transform(ST_GeomFromText('POINT(%s %s)',4326),3035))," % (lon_inf, lat_inf) +
                "     points AS (SELECT ST_Transform(ST_GeomFromText('POINT(%s %s)',4326),3035))," % (lon_sup, lat_sup) +
                "     x_i AS (SELECT ST_X(pointi.st_transform) FROM pointi)," +
                "     y_i AS (SELECT ST_Y(pointi.st_transform) FROM pointi)," +
                "     x_s AS (SELECT ST_X(points.st_transform) FROM points)," +
                "     y_s AS (SELECT ST_Y(points.st_transform) FROM points)," +
                "     x_inf AS (SELECT (x_i.st_x::numeric - (x_i.st_x::numeric % 50::numeric))::integer AS c FROM x_i)," +
                "     y_inf AS (SELECT (y_i.st_y::numeric - (y_i.st_y::numeric % 50::numeric))::integer AS c FROM y_i)," +
                "     x_sup AS (SELECT (x_s.st_x::numeric - (x_s.st_x::numeric % 50::numeric) + 50)::integer AS c FROM x_s)," +
                "     y_sup AS (SELECT (y_s.st_y::numeric - (y_s.st_y::numeric % 50::numeric) + 50)::integer AS c FROM y_s)" +
                "INSERT INTO cost_grid (geom)" +
                "SELECT ST_Transform(ST_geomfromtext('POLYGON(('||X||' '||Y||', '||(X+50)||' '||Y||', '||(X+50)||' '||(Y+50)||', '||X||' '||(Y+50)||', '||X||' '||Y||'))',3035),900913)" +
	            "FROM generate_series((SELECT x_inf.c FROM x_inf),(SELECT x_sup.c FROM x_sup),50) AS X," +
	            "     generate_series((SELECT y_inf.c FROM y_inf),(SELECT y_sup.c FROM y_sup),50) AS Y;")
    print "***** update cost grid"
    f2 = open('%s/preprocessing/costgrid/update.sql' % base_path, 'r')
    sql = f2.read()
    f2.close()
    cur.execute(sql)


print "***** Visibility graphs creation"
for zone in pedestrianAreasHighway:		
	cur.execute('SELECT PolygonToVisibilityGraphHighway(%s)',(zone,))

#for zone in pedestrianAreasAmenity:		
#	cur.execute('SELECT PolygonToVisibilityGraphAmenity(%s)',(zone,))


cur.execute("DROP TABLE IF EXISTS ways_openspace")

print "***** osm2pgrouting"
if use_extract:
	command = "%s/installation/osm2pgrouting/osm2pgrouting -file %s -conf %s/preprocessing/osm2pgrouting/mapconfig.xml -host localhost -dbname %s -user %s -passwd %s -clean" % (base_path, osm_extract, base_path, db_name, db_user, db_pass)
else:
	command = "%s/installation/osm2pgrouting/osm2pgrouting -file %s -conf %s/preprocessing/osm2pgrouting/mapconfig.xml -host localhost -dbname %s -user %s -passwd %s -clean" % (base_path, f.name, base_path, db_name, db_user, db_pass)
print command
os.system(command)

cur.execute("CREATE TABLE ways_openspace (" +
			"geom geometry(LineString,4326)," +
			"id integer," +
			"source integer," +
			"target integer);")

cur.execute("WITH nummax AS (SELECT max(gid) FROM ways)" +
						 "SELECT setval('ways_openspace_id', ((SELECT * FROM nummax)+1));")
						 
cur.execute("ALTER TABLE ways ADD COLUMN foot boolean;")
cur.execute("ALTER TABLE ways ADD COLUMN frompolygon boolean;")
cur.execute("ALTER TABLE ways ADD COLUMN cost_activity float;")
cur.execute("ALTER TABLE ways ADD COLUMN cost_nature float;")
cur.execute("ALTER TABLE ways ADD COLUMN cost_culture float;")

print "***** Import ways from polygon"
cur.execute("INSERT INTO ways(the_geom,name,class_id,gid,osm_id,foot,frompolygon) " +
			"SELECT st_transform(geom,4326),name,116,nextval('ways_openspace_id'),osm_id,TRUE,TRUE " +
			"FROM lines_from_polygon;")

print "***** pgr_createTopology"
cur.execute("SELECT pgr_createTopology('ways', 0.00001, 'the_geom', 'gid');")

print "***** Update length"
cur.execute("UPDATE ways SET length = ST_Length_Spheroid(ways.the_geom,'SPHEROID[\"WGS 84\",6378137,298.257223563]');")

print "***** Update foot attribute"
cur.execute("SELECT UpdateFootAttribute()")

print "***** Update sidewalks"
cur.execute("SELECT UpdateSideWalks()")

print "***** Create index geom on ways"
cur.execute("CREATE INDEX ways_geom_idx ON ways USING gist(the_geom);")

print "***** Update cost_activity"
cur.execute("UPDATE ways " +
			"SET cost_activity = length * (1 - cinter.activity) " +
			"FROM ( " +
			"	SELECT w.gid as id, w.the_geom, c.geom, avg(c.test_activite) as activity " +
			"	FROM cost_grid AS c, ways AS w " +
			"	WHERE ST_Intersects(ST_Transform(c.geom,4326),w.the_geom) " +
			"	GROUP BY w.gid, w.the_geom, c.geom " +
			"	) AS cinter " +
			"WHERE cinter.id = ways.gid")			
			
						 
cur.execute("UPDATE ways " +
			"SET cost_activity = length " +
			"WHERE cost_activity IS NULL;")
						 
print "***** Update cost_nature"						 				 
cur.execute("UPDATE ways " +
			"SET cost_nature = length * (1 - cinter.nature) " +
		    "FROM ( " +
		    "	SELECT w.gid as id, w.the_geom, c.geom, avg(c.test_nature) as nature " +
		    "	FROM cost_grid AS c, ways AS w " +
		    "	WHERE ST_Intersects(ST_Transform(c.geom,4326),w.the_geom) " +
		    "	GROUP BY w.gid, w.the_geom, c.geom " +
		    "	) AS cinter " +
		    "WHERE cinter.id = ways.gid")

cur.execute("UPDATE ways " +
			"SET cost_nature = length " +
			"WHERE cost_nature IS NULL;")

						 
print "***** Update cost_culture"						 				 
cur.execute("UPDATE ways " +
			"SET cost_culture = length * (1 - cinter.culture) " +
		    "FROM ( " +
		    "	SELECT w.gid as id, w.the_geom, c.geom, avg(c.test_culture) as culture " +
		    "	FROM cost_grid AS c, ways AS w " +
		    "	WHERE ST_Intersects(ST_Transform(c.geom,4326),w.the_geom) " +
		    "	GROUP BY w.gid, w.the_geom, c.geom " +
		    "	) AS cinter " +
		    "WHERE cinter.id = ways.gid")

cur.execute("UPDATE ways " +
			"SET cost_culture = length " +
			"WHERE cost_culture IS NULL;")

# close the "routing" database connection
conn.commit()
cur.close()
conn.close()
if not use_extract:
	f.close()

