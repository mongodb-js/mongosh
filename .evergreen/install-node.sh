#!/bin/bash
set -e
set -x
export BASEDIR="$PWD/.evergreen"

NPM_VERSION=10.8.3 # 10.9.0 does not install well on Windows

if [ "$OS" == "Windows_NT" ]; then
  powershell "$(cygpath -w "$BASEDIR")"/InstallNode.ps1
  . "$BASEDIR/setup-env.sh"
  mkdir -p "$BASEDIR/npm-10" && (cd "$BASEDIR/npm-10" && echo '{}' > package.json && npm i npm@$NPM_VERSION)
  # using npm 10 because npm 9.9.3 does not install well on windows

  curl -sSfLO https://raw.githubusercontent.com/mongodb-js/compass/42e6142ae08be6fec944b80ff6289e6bcd11badf/.evergreen/node-gyp-bug-workaround.sh && bash node-gyp-bug-workaround.sh
else
  if [ `uname` = Darwin ]; then
    export NVM_DIR="$BASEDIR/.nvm"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

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

. "$BASEDIR/setup-env.sh"
