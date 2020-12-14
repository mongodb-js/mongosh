#!/bin/bash
set -e
set -x

docker-compose -f ldap/docker-compose.yaml up -d
FAILED=no

sleep 10 # let mongod start up
echo 'db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers' | \
mongosh \
  --host localhost \
  --port 30017 \
  --username 'writer@EXAMPLE.COM' \
  --password 'Password1!' \
  --authenticationMechanism PLAIN \
  --authenticationDatabase '$external' | \
grep -Fq writer@EXAMPLE.COM || FAILED=yes

docker-compose -f ldap/docker-compose.yaml down

if [ $FAILED = yes ]; then
  exit 1
fi
