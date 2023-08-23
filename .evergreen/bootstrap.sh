set -e
set -x

npm ci --verbose
npm run mark-ci-required-optional-dependencies
npm install
npm run evergreen-release bump

echo "npm packages after bootstrap"
npm ls || true