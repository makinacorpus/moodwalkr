#!/usr/bin/env python
# -*- coding: utf-8 -*-


import psycopg2
import BaseHTTPServer
import re

PORT = 8000

class MyHandler(BaseHTTPServer.BaseHTTPRequestHandler):
	def do_HEAD(self):
		self.send_response(200)
		self.send_header("Content-type", "application/json")
		self.end_headers()
	def do_GET(self):
		if self.path == '/':
			with open('../index.html') as f:
				result = f.read()
				self.send_response(200)
				self.send_header("Content-type", "text/html")
				self.end_headers()
				self.wfile.write(result)
				self.wfile.close()
		elif self.path[0:11] == '/route.json':
			print self.path
			params = re.search(r'\?lat1=([0-9.]+)&lon1=([0-9.]+)&lat2=([0-9.]+)&lon2=([0-9.]+)', self.path)
			if params is not None:
				lat1 = params.group(1)
				lon1 = params.group(2)
				lat2 = params.group(3)
				lon2 = params.group(4)
			conn = psycopg2.connect("dbname=routing user=postgres")
			cur = conn.cursor()
			# cur.execute("SELECT * FROM ShortestPathGeojsonLinestring(NearestVertex('"+lat1+"','"+lon1+"'),NearestVertex('"+lat2+"','"+lon2+"'))")
			cur.execute("SELECT * FROM ShortestPathGeojsonLinestring2('"+lat1+"','"+lon1+"','"+lat2+"','"+lon2+"')")
			result=cur.fetchone()[0]
			cur.close()
			conn.close()
			self.send_response(200)
			self.send_header("Content-type", "application/json")
			self.end_headers()
			self.wfile.write(result)
			self.wfile.close()

try:
    server = BaseHTTPServer.HTTPServer(('localhost', PORT), MyHandler)
    print('Started http server')
    server.serve_forever()
except KeyboardInterrupt:
    print('^C received, shutting down server')
    server.socket.close()

