#!/usr/bin/env python
# -*- coding: utf-8 -*-


import psycopg2
import re
import flask
import smtplib
from flask import Flask, request, Response, redirect, url_for
from config import *

app = Flask(__name__)
app.config['SERVER_NAME'] = '127.0.0.1:8000'
app.config['DEBUG'] = True

@app.route("/route.json")
def route():
    print request.args
    lat1 = request.args['lat1']    
    lon1 = request.args['lon1']    
    lat2 = request.args['lat2']    
    lon2 = request.args['lon2']    
    profile = request.args['type']    
    conn = psycopg2.connect("host=localhost dbname=%s user=%s password=%s" % (db_name, db_user, db_pass))
    cur = conn.cursor()
    cur.execute("SELECT * FROM ShortestPath('" + lat1 + "','" + lon1 + "','" + lat2 + "','" + lon2 + "','" + profile + "')")
    result=cur.fetchone()[0]
    cur.close()
    conn.close()
    return Response(result, mimetype="application/json")

@app.route("/circularroute.json")
def routecircular():
    print request.args
    lat1 = request.args['lat1']    
    lon1 = request.args['lon1']    
    lat2 = request.args['lat2']    
    lon2 = request.args['lon2']  
    lat3 = request.args['lat3']    
    lon3 = request.args['lon3']    
    lat4 = request.args['lat4']    
    lon4 = request.args['lon4']    
    profile = request.args['type']    
    conn = psycopg2.connect("host=localhost dbname=%s user=%s password=%s" % (db_name, db_user, db_pass))
    cur = conn.cursor()
    cur.execute("SELECT * FROM CircularRoute('" + lat1 + "','" + lon1 + "','" + lat2 + "','" + lon2 + "','" + lat3 + "','" + lon3 + "','" + lat4 + "','" + lon4 + "','" + profile + "')")
    result=cur.fetchone()[0]
    cur.close()
    conn.close()
    return Response(result, mimetype="application/json")

@app.route('/sendemail', methods=['GET', 'POST'])
def contact():
    sender_email = request.form['email']
    sender_message = request.form['message'].encode("utf-8")
    server = smtplib.SMTP('smtp.gmail.com:587')  
    server.starttls()  
    server.login(email_login,email_password)  
    server.sendmail(sender_email, email_adress, sender_message)  
    server.quit()
    return '<script>parent.$.fancybox.close()</script>'


if __name__ == '__main__':
    app.run()
