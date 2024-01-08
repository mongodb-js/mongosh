set -e
set -x

npm ci --verbose

# if MONOGDB_VERSION_OVERRIDE is set, then we want to replace the package version
if [[ -n "$MONOGDB_VERSION_OVERRIDE" ]]; then
  export REPLACE_PACKAGE="mongodb:$MONOGDB_VERSION_OVERRIDE"
  npm run replace-package
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