#!/bin/bash
set -e

#Install everything needed for pedestrian-routing

# Variables
osmFile="/file/path/toosm/fileorpbf/name.osm" # wget http://www.overpass-api.de/api/xapi?map?bbox=1.35,43.53,1.52,43.67 -O toulouse.osm
gisDB="gis"
routingDB="routing"

# Create user "postgres"
echo "sudo -i -u postgres"
sudo -i -u postgres

# Create gis database
su postgres
createdb $gisDB
psql -d $gisDB -c "CREATE EXTENSION postgis;"
psql $gisDB -c "ALTER TABLE geometry_columns OWNER TO postgres"
psql $gisDB -c "ALTER TABLE spatial_ref_sys OWNER TO postgres"

# Create routing database
su postgres
createdb $routingDB
createlang plpgsql $routingDB
psql -d $routingDB -c "CREATE EXTENSION postgis;"
psql -d $routingDB -c "CREATE EXTENSION pgrouting;"
psql -d $routingDB -c "CREATE EXTENSION dblink;"
psql -d $routingDB -f /usr/share/postgresql/9.1/contrib/postgis-2.0/legacy.sql

# Create PostGis functions
psql -U postgres -d $gisDB -a -f functions_gis.sql -h localhost
psql -U postgres -d $routingDB -a -f functions_routing.sql -h localhost

# Create cost_grid
psql -U postgres -d $gisDB -a -f /installation/create_costgrid.sql -h localhost
psql -U postgres -d $gisDB -a -f /preprocessing/costgrid/update.sql -h localhost
