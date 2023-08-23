set -e
set -x

npm ci --verbose

npm run evergreen-release bump

echo "npm packages after bootstrap"
npm ls || true