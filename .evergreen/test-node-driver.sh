#!/bin/bash

## Runs mongosh tests against the latest a particular build of the Node driver.
##
## Params:
## DRIVER_TARBALL_PATH - the full path to either the Node driver repo to be tested against or a tarball containing the built driver (built with npm pack)
## MONGOSH_RUN_ONLY_IN_PACKAGE (optional) - a mongosh package name, without the `@mongosh` prefix.  if set,
## 											only the tests for the provided mognosh package are run.

MONGOSH_RUN_ONLY_IN_PACKAGE=${MONGOSH_RUN_ONLY_IN_PACKAGE:-""}

export REPLACE_PACKAGE="mongodb:$DRIVER_TARBALL_PATH"
npm run replace-package

npm run bootstrap -- --no-ci

npm run compile

if [ -n "$MONGOSH_RUN_ONLY_IN_PACKAGE" ]; then
	npm run test-ci-nocoverage
fi
