#!/bin/bash
set -e
set -x
export BASEDIR="$PWD/.evergreen"

if [ "$OS" == "Windows_NT" ]; then
  powershell "$(cygpath -w "$BASEDIR")"/InstallNode.ps1
  . "$BASEDIR/setup-env.sh"
else
  if [ `uname` = Darwin ]; then
    export NVM_DIR="$BASEDIR/.nvm"
    mkdir -p "${NVM_DIR}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

    echo "Setting NVM environment home: $NVM_DIR"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    set +x # nvm is very verbose
    echo nvm install --no-progress $NODE_JS_VERSION && nvm alias default $NODE_JS_VERSION
    nvm install --no-progress $NODE_JS_VERSION
    nvm alias default $NODE_JS_VERSION
    nvm use $NODE_JS_VERSION
    set -x
  fi
  npm cache clear --force || true # Try to work around `Cannot read property 'pickAlgorithm' of null` errors in CI
fi

# On Linux CI hosts, the node installation is in a system directory that
# is not writable by the current user, so we install pnpm to a user-local prefix.
if [ "$OS" != "Windows_NT" ] && [ "$(uname)" = "Linux" ]; then
  export npm_config_prefix="$HOME/.local"
  mkdir -p "$HOME/.local/lib"
  npm install -g pnpm@latest-10
  export PATH="$HOME/.local/bin:$PATH"
else
  npm install -g pnpm@latest-10
fi

. "$BASEDIR/setup-env.sh"
