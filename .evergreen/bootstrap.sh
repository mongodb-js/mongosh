set -e
set -x

npm ci --verbose
npm run mark-ci-required-optional-dependencies
(npm install && test -e node_modules/mongodb-client-encryption) || npm install --ignore-scripts
npm run evergreen-release bump

echo "npm packages after bootstrap"
npm ls || true