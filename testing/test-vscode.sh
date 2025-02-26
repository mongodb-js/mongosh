#!/bin/sh
set -x
set -e

# just to make sure: we are in the mongosh root dir
test -x packages && grep -q '"name": "mongosh"' package.json
npm -v
# we pick a target directory that is not affected by the mongosh node_modules directory
mongosh_root_dir=$PWD
test_root_dir=/tmp/mongosh-vscode-test
export SEGMENT_KEY=GtEn04CBjn39g6A0BxldDf81YGFONOz7 # fresh from /dev/urandom
rm -rf "$test_root_dir" && mkdir -p "$test_root_dir"
cd "$test_root_dir"
git clone --depth=10 https://github.com/mongodb-js/vscode.git --branch gagik/vscode-debug
cd vscode

npm ci --omit=optional

rm -rf node_modules/@mongosh node_modules/mongodb
(cd node_modules && ln -s "$mongosh_root_dir/packages" @mongosh && ln -s "$mongosh_root_dir/node_modules/mongodb" mongodb)
# This test can require a lot of memory so we bump the maximum size.
NODE_OPTIONS=--max-old-space-size=4096 npm test
cd /tmp
rm -rf "$test_root_dir"
