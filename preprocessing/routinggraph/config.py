#!/usr/bin/env python
#coding: utf8 

# Location of a local extract if any, for use with -e option.  Please also define the correct bounding box above
osm_extract="/home/makina/Téléchargements/monaco-latest.osm"

# Grand Toulouse
lon_inf="1.18"
lon_sup="1.64"
lat_inf="43.50"
lat_sup="43.77"

# Capitole et Place Wilson
#lon_inf="1.44"
#lon_sup="1.45"
#lat_inf="43.60"
#lat_sup="43.61"

# DB parameters
db_name="routing"
db_user="routing"
db_pass="KadufZyn8Dr"

# List of walkable areas
pedestrianAreasHighway=["pedestrian","footway"]
#pedestrianAreasAmenity=["parking"]
