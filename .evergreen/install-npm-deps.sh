#!/bin/bash
set -e
set -x
export BASEDIR="$PWD/.evergreen"

. "$BASEDIR/setup-env.sh"

npm ci --verbose
echo "MONOGDB_DRIVER_VERSION_OVERRIDE:$MONOGDB_DRIVER_VERSION_OVERRIDE"

# if MONOGDB_DRIVER_VERSION_OVERRIDE is set, then we want to replace the package version
if [[ -n "$MONOGDB_DRIVER_VERSION_OVERRIDE" ]]; then
  export REPLACE_PACKAGE="mongodb:$MONOGDB_DRIVER_VERSION_OVERRIDE"
  npm run replace-package
  # force because of issues with peer deps and semver pre-releases,
  # install rather than ci because `npm ci` can only install packages when your
  # package.json and package-lock.json or npm-shrinkwrap.json are in sync.
  # NOTE: this won't work on some more exotic platforms because not every dep
  # can be installed on them. That's why we only run on linux x64 platforms when
  # we set MONOGDB_DRIVER_VERSION_OVERRIDE=nightly in CI
  npm i --verbose --force
fi

# if we rewrote this script in javascript using just builtin node modules we could skip the npm ci above
npm run mark-ci-required-optional-dependencies

# install again, this time with all the optional deps. If
# mongodb-client-encryption failed to install (it can't install on some
# platforms), then install again ignoring scripts so that the package installs
# along with its types, but npm wouldn't try and compile the addon
(npm ci && test -e node_modules/mongodb-client-encryption) || npm ci --ignore-scripts

echo "npm packages after installation"
npm ls || true
