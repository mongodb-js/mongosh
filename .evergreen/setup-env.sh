set -e
set -x
export BASEDIR="$PWD/.evergreen"
export PATH="$BASEDIR/git-2:$BASEDIR/node-v$NODE_JS_VERSION-win-x64:/opt/python/3.6/bin:/opt/chefdk/gitbin:/cygdrive/c/Program Files/Git/bin:/cygdrive/c/Program Files/Git/mingw32/libexec/git-core:/cygdrive/c/Python39/Scripts:/cygdrive/c/Python39:/cygdrive/c/cmake/bin:/opt/mongodbtoolchain/v3/bin:$PATH"
export IS_MONGOSH_EVERGREEN_CI=1

if [ "$OS" != "Windows_NT" ]; then
  if which realpath; then # No realpath on macOS, but also not needed there
    export HOME="$(realpath "$HOME")" # Needed to de-confuse nvm when /home is a symlink
  fi
  export NVM_DIR="$HOME/.nvm"
  echo "Setting NVM environment home: $NVM_DIR"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use $NODE_JS_VERSION
  export PATH="$NVM_BIN:$PATH"

  export CC=gcc
  export CXX=c++

  echo "Using gcc version:"
  gcc --version

  echo "Using g++ version:"
  g++ --version

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

echo "Full path:"
echo $PATH

echo "Using node version:"
node --version

echo "Using npm version:"
npm --version

echo "Using git version:"
git --version

echo "Using python version:"
python --version

echo "Node.js OS info:"
node -p '[os.arch(), os.platform(), os.endianness(), os.type(), os.release()]'

echo "/etc/os-release contents:"
cat /etc/os-release || true
