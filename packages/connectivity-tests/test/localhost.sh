#!/bin/bash
set -e
set -x

docker build -t ubuntu20.04-mongod -f "$MONGOSH_ROOT_DIR"/scripts/docker/ubuntu20.04-mongod.Dockerfile .
docker run --rm \
  -v "$MONGOSH_ROOT_DIR":/tmp/mongosh \
  -v "$CONNECTIVITY_TEST_SOURCE_DIR":/tmp/connectivity-tests \
  ubuntu20.04-mongod -c "/tmp/connectivity-tests/localhost-run.sh"
