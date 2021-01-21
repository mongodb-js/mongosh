#!/usr/bin/env bash

set -e

if [ -t 0 ]; then # Check whether input is a TTY
  DOCKER_FLAGS='-it'
else
  DOCKER_FLAGS='-i'
fi
docker run --rm $DOCKER_FLAGS --network host "mongosh-${1}" ${@:2}
