#!/bin/bash

set -e
set -x

# Install everything needed for pedestrian-routing

# Get config
source config.sh

# Add the Ubuntugis unstable PPA in order to install Postgis 2
sudo apt-get -y install python-software-properties
sudo add-apt-repository -y ppa:ubuntugis/ppa
sudo apt-get update

# Install packages
sudo apt-get -y install \
    wget \
    postgresql-9.1 \
    git \
    python-virtualenv \
    python-dev \
    python-psycopg2 \
    build-essential \
    postgis \
    libgeos-3.3.8 \
    libprotobuf-c0 \
    postgresql-server-dev-9.1 \
    libcgal-dev \
    libboost-dev \
    python-pip \
    libexpat1-dev \
    nginx \
    supervisor

sudo pip install requests


#sudo apt-get install expat 
#sudo apt-get install  libxml2-dev proj libjson0-dev xsltproc docbook-xsl docbook-mathml gettext
#sudo apt-get install libboost-graph-dev libboost-graph1.48.0 libboost-thread-dev 

# cmake2.8.10
if test ! -d cmake-2.8.10.2; then
    wget http://www.cmake.org/files/v2.8/cmake-2.8.10.2.tar.gz
    tar xvzf cmake-2.8.10.2.tar.gz 
    rm cmake-2.8.10.2.tar.gz 
    pushd cmake-2.8.10.2/
    ./bootstrap 
    make
    sudo make install
    popd
fi

# Get a recent version of osm2pgsql and install it
if ! (dpkg -l | grep "osm2pgsql *0.80.0+r27899-4"); then
    wget http://archive.ubuntu.com/ubuntu/pool/universe/o/osm2pgsql/osm2pgsql_0.80.0+r27899-4_amd64.deb
    sudo dpkg -i osm2pgsql_0.80.0+r27899-4_amd64.deb
fi

# Install osm2pgrouting
if test ! -d osm2pgrouting; then
    git clone git://github.com/pgRouting/osm2pgrouting.git
    pushd osm2pgrouting
    make
    popd
fi

# Install pgrouting
if test ! -d pgrouting; then
    git clone git://github.com/pgRouting/pgrouting.git
    pushd pgrouting
    git checkout 818e73089abc98cbdaccd8225e1cb0bad6a44d4e
    cmake -DWITH_DD=ON .
    make
    sudo make install
    popd
fi

# Set .pgpass file
if ! grep "^localhost:5432:${db_name}:${db_user}:" ~/.pgpass; then
    echo "localhost:5432:${db_name}:${db_user}:${db_pass}" >> ~/.pgpass
fi

# Create user "postgres"
if ! sudo -u postgres psql -tAc "SELECT 'ok' FROM pg_roles WHERE rolname='${db_user}'" | grep "ok"; then
    sudo -u postgres psql -c "CREATE USER ${db_user} PASSWORD '${db_pass}';"
fi

# Create database
if ! sudo -u postgres psql -tAl | grep "^${db_name}"; then
    $root_psql -c "CREATE DATABASE ${db_name} OWNER ${db_user};"
    $root_psql ${db_name} -c "CREATE EXTENSION postgis;"
    $root_psql ${db_name} -c "ALTER TABLE geometry_columns OWNER TO ${db_user};"
    $root_psql ${db_name} -c "ALTER TABLE spatial_ref_sys OWNER TO ${db_user};"
    $root_psql ${db_name} -c "CREATE EXTENSION pgrouting;"
    $root_psql ${db_name} -f /usr/share/postgresql/9.1/contrib/postgis-2.0/legacy.sql
fi

# Create PostGis functions
$user_psql -f functions_gis.sql
$user_psql -f functions_routing.sql

# Create cost_grid
$user_psql -f create_costgrid.sql

# Configure nginx
cp ./nginx/default ./nginx/default_with_config
sed -i "s|@@@ROOT_PATH@@@|$path|g" ./nginx/default_with_config
sudo cp ./nginx/default_with_config /etc/nginx/sites-available/default
rm ./nginx/default_with_config

pushd ../routing
# Configure gunicorn
virtualenv ve
ve/bin/pip install -r requirements.txt
# Configure supervisor
sed -i "s|@@@ROOT_PATH@@@|$path|g" ./supervisord.conf
sudo ln -s ./supervisord.conf /etc/supervisor/conf.d/moodwalkr.conf
popd
sudo supervisorctl -c /etc/supervisor/supervisord.conf status

