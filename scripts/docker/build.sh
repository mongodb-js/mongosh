#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"
SHA=`git rev-parse origin/master`

docker build --build-arg commit="$SHA" -t mongosh-$1 -f $1.Dockerfile .

# https://s3.amazonaws.com/mciuploads/mongosh/32fe352b021bc6ea92a848850190fa4005babcfb/mongosh_0.2.2_amd64.deb

# https://s3.amazonaws.com/mciuploads/mongosh/32fe352b021bc6ea92a848850190fa4005babcfb/mongosh-0.2.2-win32.zip

# https://s3.amazonaws.com/mciuploads/mongosh/32fe352b021bc6ea92a848850190fa4005babcfb/mongosh-0.2.2-linux.tgz
# https://s3.amazonaws.com/mciuploads/mongosh/32fe352b021bc6ea92a848850190fa4005babcfb/mongosh-0.2.2-x86_64.rpm