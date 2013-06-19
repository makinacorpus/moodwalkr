#!/usr/bin/env python
#coding: utf8 

# Location of a local extract if any, for use with -e option.  Please also define the correct bounding box above
osm_extract="/home/makina/Téléchargements/monaco-latest.osm"

#bbox="1.35,43.53,1.52,43.67"
#lon_inf="1.18"
#lon_sup="1.64"
#lat_inf="43.50"
#lat_sup="43.77"
lon_inf="7.4055576"
lon_sup="7.4405766"
lat_inf="43.7211178"
lat_sup="43.7526212"
db_name="routing"
db_user="routing"
db_pass="KadufZyn8Dr"

# List of walkable areas
pedestrianAreasHighway=["pedestrian"]
pedestrianAreasHighway=["footway"]
#pedestrianAreasAmenity=["parking"]
