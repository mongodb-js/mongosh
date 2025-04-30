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

if [[ -z "$TEST_MONGOSH_EXECUTABLE" ]]; then
  export MONGOSH=mongosh
else
  export MONGOSH="${MONGOSH_ROOT_DIR}/${TEST_MONGOSH_EXECUTABLE}"
fi

git clone https://github.com/mongodb-js/devtools-docker-test-envs.git test-envs
cd test-envs

git checkout fdf80c7a708aa6a1bf3891f17db7459c6a888a15

"$CONNECTIVITY_TEST_SOURCE_DIR/ldap.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/localhost.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/atlas.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/kerberos.sh"
