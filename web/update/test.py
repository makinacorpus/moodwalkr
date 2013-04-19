#!/usr/bin/env python
# -*- coding: utf-8 -*-

import psycopg2
import config

# "gis" database connection
connGis = psycopg2.connect("dbname=gis user=postgres")
curGis = connGis.cursor()


for zone in config.pedestrianAreasHighway:		
	curGis.execute('SELECT PolygonToVisibilityGraphHighway(%s)',(zone,))
	result=curGis.fetchone()[0]
	print result
