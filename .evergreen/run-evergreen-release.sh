#! /usr/bin/env bash
set -e

echo "//registry.npmjs.org/:_authToken=${devtoolsbot_npm_token}" > .npmrc
set -x
export NODE_JS_VERSION=${node_js_version}
source .evergreen/setup-env.sh
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
npm run evergreen-release publish $@