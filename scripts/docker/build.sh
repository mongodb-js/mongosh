#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"
SHA=`git rev-parse origin/master`
VERSION=`git show ${SHA}:lerna.json | grep version | cut -d ":" -f 2 | cut -d '"' -f 2`

docker build --build-arg commit="$SHA" --build-arg version="$VERSION" -t mongosh-$1 -f $1.Dockerfile .
