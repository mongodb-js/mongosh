#!/bin/bash
set -e
set -x
export BASEDIR="$PWD/.evergreen"

. "$BASEDIR/setup-env.sh"

# Install all dependencies
pnpm install --frozen-lockfile

echo "MONOGDB_DRIVER_VERSION_OVERRIDE:$MONOGDB_DRIVER_VERSION_OVERRIDE"

pnpm run mark-ci-required-optional-dependencies

# if MONOGDB_DRIVER_VERSION_OVERRIDE is set, then we want to replace the package version
if [[ -n "$MONOGDB_DRIVER_VERSION_OVERRIDE" ]]; then
  export REPLACE_PACKAGE="mongodb:$MONOGDB_DRIVER_VERSION_OVERRIDE"
  pnpm run replace-package
  # force because of issues with peer deps and semver pre-releases,
  # install rather than frozen-lockfile because the package.json has changed.
  # NOTE: this won't work on some more exotic platforms because not every dep
  # can be installed on them. That's why we only run on linux x64 platforms when
  # we set MONOGDB_DRIVER_VERSION_OVERRIDE=nightly in CI
  pnpm install --force
fi

# install again, this time with all the optional deps. If
# mongodb-client-encryption failed to install (it can't install on some
# platforms), then install again ignoring scripts so that the package installs
# along with its types, but pnpm wouldn't try and compile the addon
if [[ -n "$MONGOSH_INSTALL_WORKSPACE" ]]; then
  # Check if the workspace or root actually depends on mongodb-client-encryption
  if pnpm ls --filter "$MONGOSH_INSTALL_WORKSPACE" --depth 1 mongodb-client-encryption > /dev/null 2>&1; then
    echo "Workspace or root depends on mongodb-client-encryption, retrying install with optional deps..."
    (pnpm install && test -e node_modules/mongodb-client-encryption) || pnpm install --ignore-scripts
  else
    pnpm install
  fi
else
  (pnpm install && test -e node_modules/mongodb-client-encryption) || pnpm install --ignore-scripts
fi

echo "pnpm packages after installation"
pnpm ls || true
