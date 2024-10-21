#!/usr/bin/env bash
set -e
export NODE_JS_VERSION=${NODE_JS_VERSION}
export TASK_NAME=${TASK_NAME}

if [[ "$DISABLE_OPENSSL_SHARED_CONFIG_FOR_BUNDLED_OPENSSL" == "true" ]] && [[ ! "$TASK_NAME" =~ openssl(3|11) ]]; then
  # On RHEL9 and based-distros, an additional configuration option
  # `rh-allow-sha1-signatures` is present which is not recognizable to the
  # OpenSSL version bundled with Node.js and hence the mongosh binary fails to
  # run. Explicitly on those hosts we disable effect of --openssl-shared-config
  # flag which is pushed by boxednode when bundling Node.js
  export OPENSSL_CONF=""
fi

source .evergreen/setup-env.sh
dist/mongosh --version

export MONGOSH_TEST_EXECUTABLE_PATH="$(pwd)/dist/mongosh"

if [ "$OS" == "Windows_NT" ]; then
  # Fix absolute path before handing over to node
  export MONGOSH_TEST_EXECUTABLE_PATH="$(cygpath -w "$MONGOSH_TEST_EXECUTABLE_PATH")"
fi

echo "$MONGOSH_TEST_EXECUTABLE_PATH"
npm run test-e2e
