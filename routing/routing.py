#!/usr/bin/env python
# -*- coding: utf-8 -*-


import psycopg2
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import re
from SocketServer import ThreadingMixIn
import threading

PORT = 8000
db_name="routing"
db_user="routing"
db_pass="KadufZyn8Dr"

class MyHandler(BaseHTTPRequestHandler):
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
        if self.path == '/info.html':
            with open('../info.html') as f:
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
        if self.path.endswith(".png"):
            f = open('../' + self.path)
            self.send_response(200)
            self.send_header("Content-type", "image/png")
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
            cur.execute("SELECT * FROM ShortestPath('"+lat1+"','"+lon1+"','"+lat2+"','"+lon2+"','"+profile+"')")
            result=cur.fetchone()[0]
            cur.close()
            conn.close()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(result)
            self.wfile.close()
        if self.path[0:19] == '/circularroute.json':
            print self.path
            params = re.search(r'\?lat1=([0-9.]+)&lon1=([0-9.]+)&lat2=([0-9.]+)&lon2=([0-9.]+)&lat3=([0-9.]+)&lon3=([0-9.]+)&lat4=([0-9.]+)&lon4=([0-9.]+)&type=(\w+)', self.path)
            if params is not None:
                lat1 = params.group(1)
                lon1 = params.group(2)
                lat2 = params.group(3)
                lon2 = params.group(4)
                lat3 = params.group(5)
                lon3 = params.group(6)
                lat4 = params.group(7)
                lon4 = params.group(8)
                profile = params.group(9)
            conn = psycopg2.connect("host=localhost dbname=%s user=%s password=%s" % (db_name, db_user, db_pass))
            cur = conn.cursor()
            cur.execute("SELECT * FROM CircularRoute('"+lat1+"','"+lon1+"','"+lat2+"','"+lon2+"','"+lat3+"','"+lon3+"','"+lat4+"','"+lon4+"','"+profile+"')")
            result=cur.fetchone()[0]
            cur.close()
            conn.close()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(result)
            self.wfile.close()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

try:
    server = ThreadedHTTPServer(('', PORT), MyHandler)
    print('Started http server')
    server.serve_forever()
except KeyboardInterrupt:
    print('^C received, shutting down server')
    server.socket.close()

