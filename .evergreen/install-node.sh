set -e
set -x
export BASEDIR="$PWD/.evergreen"

if [ "$OS" == "Windows_NT" ]; then
  powershell "$(cygpath -w "$BASEDIR")"/InstallNode.ps1
else
  if which realpath; then # No realpath on macOS, but also not needed there
    export HOME="$(realpath "$HOME")" # Needed to de-confuse nvm when /home is a symlink
  fi
  export NVM_DIR="$HOME/.nvm"

  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

  echo "Setting NVM environment home: $NVM_DIR"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

  nvm install --no-progress $NODE_JS_VERSION
  nvm alias default $NODE_JS_VERSION

  if env PATH="/opt/chefdk/gitbin:$PATH" git --version | grep -q 'git version 1.'; then
    (cd "$BASEDIR" &&
      curl -sSfL https://github.com/git/git/archive/refs/tags/v2.31.1.tar.gz | tar -xvz &&
      mv git-2.31.1 git-2 &&
      cd git-2 &&
      make -j8 NO_EXPAT=1)
  fi
fi

. "$BASEDIR/setup-env.sh"

# We need the build package for various tasks, and can bootstrap the cli-repl
# package on all hosts, including dependencies.
# mongodb-client-encryption cannot be installed everywhere without prerequisites
# (because it's hard to build from source when there's no prebuilts available
# because it requires libmongocrypt to be installed globally then), but we still
# need its types; so we first try to install it, and if that fails, we fall back
# to installing with --ignore-scripts (i.e. do not attempt to build addons)
# and only do the TypeScript compilation step, which is sufficient for the
# executable compilation step.
npm ci --verbose

npm run bootstrap-ci -- --scope @mongosh/build --ignore-prepublish
(npm run bootstrap-ci -- --scope @mongosh/cli-repl --include-dependencies --ignore-prepublish && test -e packages/service-provider-server/node_modules/mongodb-client-encryption) || \
  npm run bootstrap-ci -- --scope @mongosh/cli-repl --include-dependencies --ignore-prepublish --ignore-scripts
