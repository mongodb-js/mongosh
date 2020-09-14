#!/usr/bin/env bash

set -e

docker run --rm -it --network host "mongosh-${1}" ${@:2}
