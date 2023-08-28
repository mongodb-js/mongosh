set -e
set -x

npm ci --verbose

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