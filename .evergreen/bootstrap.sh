set -e
set -x

npm ci --verbose

if [ x"$NPM_DEPS_MODE" = x"cli_build" ]; then
  npm run compile-cli
elif [ x"$NPM_DEPS_MODE" = x"all" ]; then
  npm run compile
else
  echo "invalid value of NPM_DEPS_MODE: '$NPM_DEPS_MODE'"
  exit 1
fi

echo "npm packages after bootstrap"
npm ls || true


npm run evergreen-release bump
