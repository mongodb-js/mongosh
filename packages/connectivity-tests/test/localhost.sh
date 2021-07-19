#!/bin/bash
set -e
set -x

function try_connect_explicit() {
  echo 'db.runCommand({ connectionStatus: 1 })' |
    (mongosh --host localhost --port 27021 | grep -Fq authenticatedUsers && echo 'no') || echo 'yes'
}

function try_connect_connection_string() {
  echo 'db.runCommand({ connectionStatus: 1 })' |
    (mongosh "mongodb://localhost:27021/" | grep -Fq authenticatedUsers && echo 'no') || echo 'yes'
}

function test_for_version() {
  MONGODB_VERSION="$1" docker-compose -f enterprise/docker-compose.yaml up -d

  sleep 10 # let mongod start up
  FAILED_EXPLICIT=$(try_connect_explicit)
  FAILED_CONNECTION_STRING=$(try_connect_connection_string)

  MONGODB_VERSION="$1" docker-compose -f enterprise/docker-compose.yaml down

  if [ $FAILED_EXPLICIT = yes ]; then
    ANY_FAILED=yes
    echo "Localhost test with explicit host/port failed for $1"
  fi

  if [ $FAILED_CONNECTION_STRING = yes ]; then
    ANY_FAILED=yes
    echo "Localhost test with connection string failed for $1"
  fi
}

ANY_FAILED=no
test_for_version '4.2'
test_for_version '4.4'
test_for_version '5.0'

if [ $ANY_FAILED = yes ]; then
  exit 1
fi
