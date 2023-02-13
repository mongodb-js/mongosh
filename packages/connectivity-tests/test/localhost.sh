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
  MONGODB_VERSION="$1" docker-compose -f docker/enterprise/docker-compose.yaml up -d

  sleep 10 # let mongod start up
  FAILED_EXPLICIT=$(try_connect_explicit)
  FAILED_CONNECTION_STRING=$(try_connect_connection_string)

  MONGODB_VERSION="$1" docker-compose -f docker/enterprise/docker-compose.yaml down

  if [ $FAILED_EXPLICIT = yes ]; then
    ANY_FAILED=yes
    echo "Localhost test with explicit host/port failed for $1"
  fi

  if [ $FAILED_CONNECTION_STRING = yes ]; then
    ANY_FAILED=yes
    echo "Localhost test with connection string failed for $1"
  fi
}

# https://jira.mongodb.org/browse/MONGOSH-1378
# Note that this test only has limited significance right now,
# as we aren't testing the Node.js versions affected here anywhere in CI.
function try_connect_ipv4only_dualstackhostname() {
  MONGODB_VERSION="5.0" docker-compose -f docker/enterprise/docker-compose.yaml up -d

  # Use a second docker container to be able to modify /etc/hosts easily
  cat <<EOF | docker run -i --rm --network host -v /:/host ubuntu:22.04 bash && FAILED=no || FAILED=yes
export PATH=/host$(echo "$PATH" | sed 's~:~:/host~g'):\$PATH

set -e
set -x

echo -e '::1 dualstackhost\n127.0.0.1 dualstackhost\n' > /etc/hosts

echo 'db.runCommand({ connectionStatus: 1 })' | \
  mongosh "mongodb://dualstackhost:27021/?serverSelectionTimeoutMS=2000" | \
  grep -Fq authenticatedUsers
EOF
  if [ $FAILED = yes ]; then
    ANY_FAILED=yes
    echo "Localhost test with ipv4-only access failed"
  fi

  MONGODB_VERSION="5.0" docker-compose -f docker/enterprise/docker-compose.yaml down
}

ANY_FAILED=no
test_for_version '4.2'
test_for_version '4.4'
test_for_version '5.0'
try_connect_ipv4only_dualstackhostname

if [ $ANY_FAILED = yes ]; then
  exit 1
fi
