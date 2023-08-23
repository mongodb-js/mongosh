set -e
set -x

# Depending on $NPM_DEPS_MODE, we select for which packages to install npm
# dependencies, since we cannot install dependencies of all packages
# on all hosts.

# Always install top-level dependencies.
npm ci --verbose

echo "npm packages before required-optional-dependencies"
npm ls || true

# In CI, dependencies that are otherwise optional can be required.
# Mark them as necessary here, so that we get decent error messages
# if installing one of them fails.
npm run mark-ci-required-optional-dependencies

if [ x"$NPM_DEPS_MODE" = x"cli_build" ]; then
  # Install cli-repl + dependencies.
  # mongodb-client-encryption cannot be installed everywhere without prerequisites
  # (because it's hard to build from source when there's no prebuilts available
  # because it requires libmongocrypt to be installed globally then), but we still
  # need its types; so if we do not need all packages to be installed,
  # we first try to install mongodb-client-encryption, and if that fails, we fall back
  # to installing with --ignore-scripts (i.e. do not attempt to build addons).
  (npm ci -w @mongosh/build -w @mongosh/cli-repl && test -e packages/service-provider-server/node_modules/mongodb-client-encryption) || \
    npm ci -w @mongosh/cli-repl --ignore-scripts
  npm run compile-cli

elif [ x"$NPM_DEPS_MODE" = x"all" ]; then
  # Install app packages, all dependencies including optional ones after running
  # mark-ci-required-optional-dependencies. Fail if we can't install an optional
  # dep.
  npm ci
  npm run compile
else
  echo "invalid value of NPM_DEPS_MODE: '$NPM_DEPS_MODE'"
  exit 1
fi

echo "npm packages after required-optional-dependencies"
npm ls || true


npm run evergreen-release bump
