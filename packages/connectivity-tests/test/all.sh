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
export TEST_TMPDIR="$PWD"

git clone git@github.com:mongodb-js/devtools-docker-test-envs.git test-envs
cd test-envs

git checkout f029f9e3a9cc006a6aeb60d941b4f8d87ae4bc95

"$CONNECTIVITY_TEST_SOURCE_DIR/ldap.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/localhost.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/atlas.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/kerberos.sh"
