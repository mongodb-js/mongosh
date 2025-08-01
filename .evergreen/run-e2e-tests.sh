#!/usr/bin/env bash
set -e
export NODE_JS_VERSION=${NODE_JS_VERSION}
export TASK_NAME=${TASK_NAME}

source .evergreen/setup-env.sh
dist/mongosh --version

export MONGOSH_TEST_EXECUTABLE_PATH="$(pwd)/dist/mongosh"

if [ "$OS" == "Windows_NT" ]; then
  # Fix absolute path before handing over to node
  export MONGOSH_TEST_EXECUTABLE_PATH="$(cygpath -w "$MONGOSH_TEST_EXECUTABLE_PATH")"
fi

echo "$MONGOSH_TEST_EXECUTABLE_PATH"
npm run test-e2e
