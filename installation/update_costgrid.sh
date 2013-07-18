#!/bin/bash

source config.sh

$user_psql -f ../preprocessing/costgrid/update.sql

