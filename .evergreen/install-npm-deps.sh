set -e
set -x

npm ci --verbose

echo "MONOGDB_DRIVER_VERSION_OVERRIDE:$MONOGDB_DRIVER_VERSION_OVERRIDE"

# if MONOGDB_DRIVER_VERSION_OVERRIDE is set, then we want to replace the package version
if [[ -n "$MONOGDB_DRIVER_VERSION_OVERRIDE" ]]; then
  export REPLACE_PACKAGE="mongodb:$MONOGDB_DRIVER_VERSION_OVERRIDE"
  npm run replace-package
  npm ci --verbose --force # force because of issues with peer deps and semver pre-releases
fi

# if we rewrote this script in javascript using just builtin node modules we could skip the npm ci above
npm run mark-ci-required-optional-dependencies

# install again, this time with all the optional deps. If
# mongodb-client-encryption failed to install (it can't install on some
# platforms), then install again ignoring scripts so that the package installs
# along with its types, but npm wouldn't try and compile the addon
(npm ci && test -e node_modules/mongodb-client-encryption) || npm ci --ignore-scripts

npm run evergreen-release bump

echo "npm packages after installation"
npm ls || true