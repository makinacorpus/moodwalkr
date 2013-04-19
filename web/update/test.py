#!/usr/bin/env python
# -*- coding: utf-8 -*-

import psycopg2
import config

# "gis" database connection
connGis = psycopg2.connect("dbname=gis user=postgres")
curGis = connGis.cursor()


for zone in config.pedestrianAreas:		
	request = "SELECT PolygonToVisibilityGraph(%s,%s)" % (zone[0],zone[1])
	curGis.execute(request)
	result=curGis.fetchone()[0]
	print result
