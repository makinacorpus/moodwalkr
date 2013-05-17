#!/usr/bin/env python
# -*- coding: utf-8 -*-


import psycopg2
import BaseHTTPServer
import re

PORT = 8000
db_name="routing"
db_user="routing"
db_pass="KadufZyn8Dr"

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
        if self.path.endswith(".js"):
            f = open('../' + self.path)
            self.send_response(200)
            self.send_header("Content-type", "text/javascript")
            self.end_headers()
            self.wfile.write(f.read())
            f.close()
            return
        if self.path.endswith(".css"):
            f = open('../' + self.path)
            self.send_response(200)
            self.send_header("Content-type", "text/css")
            self.end_headers()
            self.wfile.write(f.read())
            f.close()
            return
        if self.path.endswith(".svg"):
            f = open('../' + self.path)
            self.send_response(200)
            self.send_header("Content-type", "image/svg+xml")
            self.end_headers()
            self.wfile.write(f.read())
            f.close()
            return
        if self.path[0:11] == '/route.json':
            print self.path
            params = re.search(r'\?lat1=([0-9.]+)&lon1=([0-9.]+)&lat2=([0-9.]+)&lon2=([0-9.]+)&type=(\w+)', self.path)
            if params is not None:
                lat1 = params.group(1)
                lon1 = params.group(2)
                lat2 = params.group(3)
                lon2 = params.group(4)
                profile = params.group(5)
            conn = psycopg2.connect("host=localhost dbname=%s user=%s password=%s" % (db_name, db_user, db_pass))
            cur = conn.cursor()
            # cur.execute("SELECT * FROM ShortestPathGeojsonLinestring(NearestVertex('"+lat1+"','"+lon1+"'),NearestVertex('"+lat2+"','"+lon2+"'))")
            cur.execute("SELECT * FROM ShortestPathGeojsonLinestring2('"+lat1+"','"+lon1+"','"+lat2+"','"+lon2+"','"+profile+"')")
            result=cur.fetchone()[0]
            cur.close()
            conn.close()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(result)
            self.wfile.close()

try:
    server = BaseHTTPServer.HTTPServer(('', PORT), MyHandler)
    print('Started http server')
    server.serve_forever()
except KeyboardInterrupt:
    print('^C received, shutting down server')
    server.socket.close()

