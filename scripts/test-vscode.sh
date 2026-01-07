#!/bin/sh
set -x
set -e
# just to make sure: we are in the mongosh root dir
test -x packages && grep -q '"name": "mongosh"' package.json
pnpm -v
# we pick a target directory that is not affected by the mongosh node_modules directory
mongosh_root_dir=$PWD
test_root_dir=/tmp/mongosh-vscode-test
export SEGMENT_KEY=GtEn04CBjn39g6A0BxldDf81YGFONOz7 # fresh from /dev/urandom
rm -rf "$test_root_dir" && mkdir -p "$test_root_dir"
cd "$test_root_dir"
git clone --depth=10 https://github.com/mongodb-js/vscode.git
cd vscode
# Build overrides object for all local mongosh packages
overrides="{"
for pkg_dir in "$mongosh_root_dir"/packages/*/; do
  if [ -f "$pkg_dir/package.json" ]; then
    pkg_name=$(jq -r '.name' "$pkg_dir/package.json")
    overrides="$overrides\"$pkg_name\":\"file:$pkg_dir\","
  fi
done
# Add other required packages
overrides="$overrides\"mongodb\":\"file:$mongosh_root_dir/node_modules/mongodb\","
overrides="$overrides\"@mongodb-js/devtools-connect\":\"file:$mongosh_root_dir/node_modules/@mongodb-js/devtools-connect\","
overrides="$overrides\"@mongodb-js/devtools-proxy-support\":\"file:$mongosh_root_dir/node_modules/@mongodb-js/devtools-proxy-support\""
overrides="$overrides}"

# Add pnpm overrides to package.json
jq --argjson overrides "$overrides" '.pnpm.overrides = $overrides' package.json > package.json.tmp && mv package.json.tmp package.json
pnpm install
# This test can require a lot of memory so we bump the maximum size.
NODE_OPTIONS='--max-old-space-size=4096 --no-experimental-strip-types' pnpm test
cd /tmp
rm -rf "$test_root_dir"
