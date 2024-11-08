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
  export NVM_DIR="$BASEDIR/.nvm"
  mkdir -p "${NVM_DIR}"

  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

  echo "Setting NVM environment home: $NVM_DIR"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

  set +x # nvm is very verbose

  # A few distros where pre-built node20 does not work out of the box and hence
  # needs to be built from source
  if [[ "${DISTRO_ID}" =~ ^(amazon2-|rhel7|ubuntu18|suse12) ]] && [[ "$NODE_JS_VERSION" =~ ^20 ]];
  then
    NODE_JS_SOURCE_VERSION="$NODE_JS_VERSION"
    if echo $NODE_JS_VERSION | grep -q ^20 ; then
      # Node.js 20.11.1 is the last 20.x that builds out of the box on RHEL7
      # https://github.com/nodejs/node/issues/52223
      NODE_JS_SOURCE_VERSION=20.11.1
    fi
    env NODE_JS_VERSION="$NODE_JS_SOURCE_VERSION" bash "$BASEDIR/install-node-source.sh"
    nvm use $NODE_JS_SOURCE_VERSION
  else
    echo nvm install --no-progress $NODE_JS_VERSION && nvm alias default $NODE_JS_VERSION
    nvm install --no-progress $NODE_JS_VERSION
    nvm alias default $NODE_JS_VERSION
    nvm use $NODE_JS_VERSION
  fi
  set -x

  if env PATH="/opt/chefdk/gitbin:$PATH" git --version | grep -q 'git version 1.'; then
    (cd "$BASEDIR" &&
      curl -sSfL https://github.com/git/git/archive/refs/tags/v2.31.1.tar.gz | tar -xvz &&
      mv git-2.31.1 git-2 &&
      cd git-2 &&
      make -j8 NO_EXPAT=1)
  fi

  npm cache clear --force || true # Try to work around `Cannot read property 'pickAlgorithm' of null` errors in CI
  # Started observing CI failures on RHEL 7.2 (s390x) for installing npm, all
  # related to network issues hence adding a retry with backoff here.
  bash "$BASEDIR/retry-with-backoff.sh" npm i -g npm@$NPM_VERSION
fi

. "$BASEDIR/setup-env.sh"
