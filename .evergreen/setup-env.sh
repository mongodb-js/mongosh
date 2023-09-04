set -e
set -x
export BASEDIR="$PWD/.evergreen"
export PATH="/cygdrive/c/python/Python311/Scripts:/cygdrive/c/python/Python311:/cygdrive/c/Python311/Scripts:/cygdrive/c/Python311:/opt/python/3.6/bin:$BASEDIR/mingit/cmd:$BASEDIR/mingit/mingw64/libexec/git-core:$BASEDIR/git-2:$BASEDIR/npm-9/node_modules/.bin:$BASEDIR/node-v$NODE_JS_VERSION-win-x64:/opt/java/jdk16/bin:/opt/chefdk/gitbin:/cygdrive/c/cmake/bin:/opt/mongodbtoolchain/v4/bin:/opt/mongodbtoolchain/v3/bin:$PATH"
export IS_MONGOSH_EVERGREEN_CI=1
export DEBUG="mongodb*,$DEBUG"

if [ "$OS" != "Windows_NT" ]; then
  if which realpath; then # No realpath on macOS, but also not needed there
    export HOME="$(realpath "$HOME")" # Needed to de-confuse nvm when /home is a symlink
  fi
  export NVM_DIR="$BASEDIR/.nvm"
  echo "Setting NVM environment home: $NVM_DIR"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  set +x # nvm is very verbose
  echo nvm use $NODE_JS_VERSION
  nvm use $NODE_JS_VERSION
  set -x
  export PATH="$NVM_BIN:$PATH"

  export CC=gcc
  export CXX=g++

  echo "Using gcc version:"
  (which gcc && gcc --version)

  echo "Using g++ version:"
  (which g++ && g++ --version)

  if [ -x "$BASEDIR/git-2/git" ]; then
    export GIT_EXEC_PATH="$BASEDIR/git-2"
  fi
fi

export EVERGREEN_EXPANSIONS_PATH="$BASEDIR/../../tmp/expansions.yaml"

if [ "$OS" == "Windows_NT" ]; then
  export EVERGREEN_EXPANSIONS_PATH="$(cygpath -w "$EVERGREEN_EXPANSIONS_PATH")"
fi

# On RHEL hosts, we run as root for some reason
if [ `uname` = Linux ]; then
  export npm_config_unsafe_perm=true
fi

# npm@7 changed the behavior to run install scripts for packages
# in the background in parallel. While that's a good idea in general,
# it's problematic for us, because it means that packages that
# have a diamond dependency on node-addon-api (at least two addons
# depend on it) won't build properly on Windows, since multiple scripts
# try to build node-addon-api in the same directory at the same time,
# which is not something that Windows is laid out to do.
# --foreground-scripts works around this.
# Refs: https://docs.npmjs.com/cli/v8/using-npm/scripts#life-cycle-scripts
export npm_config_foreground_scripts=true

export npm_config_registry=https://registry.npmjs.org/
export npm_config_loglevel=verbose
export npm_config_logs_max=10000
export npm_config_logs_dir="$PWD/../npm-logs"
mkdir -p "$npm_config_logs_dir"
if [ "$OS" == "Windows_NT" ]; then
  export npm_config_logs_dir="$(cygpath -w "$npm_config_logs_dir")"
fi

echo "Running on:"
uname -a

echo "Full path:"
echo $PATH

echo "Using node version:"
(which node && node --version)

echo "Using npm version:"
(which npm && npm --version)

echo "Using git version:"
(which git && git --version)

echo "Using python version:"
(which python && python --version) || true

echo "Using python3 version:"
(which python3 && python3 --version) || true

echo "Node.js OS info:"
node -p '[os.arch(), os.platform(), os.endianness(), os.type(), os.release()]'

echo "/etc/os-release contents:"
cat /etc/os-release || true
