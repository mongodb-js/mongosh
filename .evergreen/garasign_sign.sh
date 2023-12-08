#!/usr/bin/env bash

## uses Garasign to sign a linux build
# 
# This script is intended to run on a linux distro.
# 
# required arguments
# 
## garasign_username
## garasign_password
## artifactory_username
## artifactory_password
## file

if [ -z ${garasign_username+omitted} ]; then echo "garasign_username is unset" && exit 1; fi
if [ -z ${garasign_password+omitted} ]; then echo "garasign_password is unset" && exit 1; fi
if [ -z ${artifactory_username+omitted} ]; then echo "artifactory_username is unset" && exit 1; fi
if [ -z ${artifactory_password+omitted} ]; then echo "artifactory_password is unset" && exit 1; fi
if [ -z ${file+omitted} ]; then echo "file is unset" && exit 1; fi

echo "Debug: starting to sign $file"

echo "${artifactory_password}" | docker login --password-stdin --username ${artifactory_username} artifactory.corp.mongodb.com

echo "GRS_CONFIG_USER1_USERNAME=${garasign_username}" >> "signing-envfile"
echo "GRS_CONFIG_USER1_PASSWORD=${garasign_password}" >> "signing-envfile"

docker run \
  --env-file=signing-envfile \
  --rm \
  -v $(pwd):$(pwd) \
  -w $(pwd) \
  artifactory.corp.mongodb.com/release-tools-container-registry-local/garasign-gpg \
  /bin/bash -c "gpgloader && gpg --yes -v --armor -o file.sig --detach-sign file"