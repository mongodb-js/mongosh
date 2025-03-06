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

  npm cache clear --force || true # Try to work around `Cannot read property 'pickAlgorithm' of null` errors in CI
fi

. "$BASEDIR/setup-env.sh"
