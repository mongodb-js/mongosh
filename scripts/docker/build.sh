#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"

# Used for verifying that we actually have a working csfle shared library
# pnpm install runs in current directory (scripts/docker) for this isolated check
[ -x node_modules/mongodb-crypt-library-version ] || (pnpm install)

# we don't have credentials for registry.suse.com and docker now requires them due to our config
if [[ "$1" == suse* ]]; then
  unset DOCKER_CONFIG
fi

if [ x"$ARTIFACT_URL" = x"" ]; then
  SHA=`git rev-parse origin/main`
  VERSION=`git show ${SHA}:../../packages/mongosh/package.json | grep '"version"' | cut -d ":" -f 2 | cut -d '"' -f 2`
  case "$1" in
    *deb)       FILENAME="mongodb-mongosh_${VERSION}_amd64.deb";;
    suse*)      FILENAME="mongodb-mongosh-${VERSION}.suse12.x86_64.rpm";;
    amazon1*)   FILENAME="mongodb-mongosh-${VERSION}.amzn1.x86_64.rpm";;
    centos7*)   FILENAME="mongodb-mongosh-${VERSION}.el8.x86_64.rpm";;
    rocky8*)    FILENAME="mongodb-mongosh-${VERSION}.el8.x86_64.rpm";;
    fedora*)    FILENAME="mongodb-mongosh-${VERSION}.el8.x86_64.rpm";;
    *)          FILENAME="mongodb-mongosh-${VERSION}.el7.x86_64.rpm";; # amzn2
  esac
  ARTIFACT_URL="https://s3.amazonaws.com/mciuploads/mongosh/${SHA}/${FILENAME}"
fi

docker build --build-arg artifact_url="$ARTIFACT_URL" -t mongosh-$1 -f $1.Dockerfile .
