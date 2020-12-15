#!/bin/bash
set -e
set -x

export CONNECTIVITY_TEST_SOURCE_DIR="$(realpath -s $(dirname "$0"))"
export PATH="$CONNECTIVITY_TEST_SOURCE_DIR/../node_modules/.bin:$PATH"
export MONGOSH_ROOT_DIR="$CONNECTIVITY_TEST_SOURCE_DIR"/../../..
TEST_TMPDIR="$MONGOSH_ROOT_DIR"/tmp/connectivitiy
rm -rf "$TEST_TMPDIR"
mkdir -p "$TEST_TMPDIR"
cd "$TEST_TMPDIR"
TEST_TMPDIR="$PWD"

git clone git@github.com:mongodb-js/devtools-docker-test-envs.git test-envs
cd test-envs
git checkout de257688e6b7ce265a70bf75c7127c6da0bf2cf0

source "$CONNECTIVITY_TEST_SOURCE_DIR/ldap.sh"
source "$CONNECTIVITY_TEST_SOURCE_DIR/localhost.sh"
