#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"
SHA=`git rev-parse origin/master`

docker build --build-arg commit="$SHA" -t mongosh-$1 -f $1.Dockerfile .
