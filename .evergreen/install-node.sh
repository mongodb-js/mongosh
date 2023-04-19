set -e
set -x
export BASEDIR="$PWD/.evergreen"

if [ "$OS" == "Windows_NT" ]; then
  powershell "$(cygpath -w "$BASEDIR")"/InstallNode.ps1
  . "$BASEDIR/setup-env.sh"
  mkdir -p "$BASEDIR/npm-8" && (cd "$BASEDIR/npm-8" && echo '{}' > package.json && npm i npm@8.x)

  curl -sSfLO https://raw.githubusercontent.com/mongodb-js/compass/42e6142ae08be6fec944b80ff6289e6bcd11badf/.evergreen/node-gyp-bug-workaround.sh && bash node-gyp-bug-workaround.sh
else
  if which realpath; then # No realpath on macOS, but also not needed there
    export HOME="$(realpath "$HOME")" # Needed to de-confuse nvm when /home is a symlink
  fi
  # Some Node.js driver versions leave a ~/.npmrc file lying around
  # that breaks nvm because it contains a 'prefix=' option (pointing
  # to a directory that no longer exists anyway).
  if [ -e "$HOME/.npmrc" ]; then
    # different `sed` arguments on macOS than for GNU sed ...
    if [ `uname` == Darwin ]; then
      sed -i'~' -e 's/^prefix=.*$//' "$HOME/.npmrc"
    else
      sed -i "$HOME/.npmrc" -e 's/^prefix=.*$//'
    fi
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

  npm cache clear --force || true # Try to work around `Cannot read property 'pickAlgorithm' of null` errors in CI
  npm i -g npm@8.x
fi

. "$BASEDIR/setup-env.sh"
