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

git checkout ca4bacd23e6f7ea07618c303b20556e3e4c9c2e6

"$CONNECTIVITY_TEST_SOURCE_DIR/ldap.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/localhost.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/atlas.sh"
"$CONNECTIVITY_TEST_SOURCE_DIR/kerberos.sh"
