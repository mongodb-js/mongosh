#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"

if [ x"$ARTIFACT_URL" = x"" ]; then
  SHA=`git rev-parse origin/main`
  VERSION=`git show ${SHA}:../../lerna.json | grep version | cut -d ":" -f 2 | cut -d '"' -f 2`
  case "$1" in
    *deb)       FILENAME="mongodb-mongosh_${VERSION}_amd64.deb";;
    suse*)      FILENAME="mongodb-mongosh-${VERSION}.suse12.x86_64.rpm";;
    amazon1*)   FILENAME="mongodb-mongosh-${VERSION}.amzn1.x86_64.rpm";;
    centos7*)   FILENAME="mongodb-mongosh-${VERSION}.el8.x86_64.rpm";;
    fedora*)    FILENAME="mongodb-mongosh-${VERSION}.el8.x86_64.rpm";;
    *)          FILENAME="mongodb-mongosh-${VERSION}.el7.x86_64.rpm";; # amzn2, centos8
  esac
  ARTIFACT_URL="https://s3.amazonaws.com/mciuploads/mongosh/${SHA}/${FILENAME}"
fi

docker build --build-arg artifact_url="$ARTIFACT_URL" -t mongosh-$1 -f $1.Dockerfile .
