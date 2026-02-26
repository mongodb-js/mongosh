set -e
set -x

OS_ARCH="$(uname "-m")"

export BASEDIR="$PWD/.evergreen"
export PATH="$BASEDIR/node-v$NODE_JS_VERSION-win-x64:/opt/java/jdk17/bin:$PATH"
export MONGOSH_GLOBAL_CONFIG_FILE_FOR_TESTING="$BASEDIR/../packages/testing/tests-globalconfig.conf"

export IS_MONGOSH_EVERGREEN_CI=1
export DEBUG="mongodb*,$DEBUG"

# This is, weirdly enough, specifically set on s390x hosts, but messes
# with our e2e tests.
if [ x"$TERM" = x"dumb" ]; then
  unset TERM
fi
echo "TERM variable is set to '${TERM:-}'"

if [ "$OS" != "Windows_NT" ]; then
    if [ `uname` = Darwin ]; then
    # the CI macOS machines have an outdated Clang that
    # cannot build recent Node.js versions, so we use
    # the LLVM version installed via Homebrew
    # (both on arm64 and x64)
    echo "Using clang version:"
    (which clang && clang --version)

    echo "Using clang++ version:"
    (which clang++ && clang++ --version)

    export NVM_DIR="$BASEDIR/.nvm"
    echo "Setting NVM environment home: $NVM_DIR"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    set +x # nvm is very verbose
    nvm use $NODE_JS_VERSION
    set -x
    export PATH="$NVM_BIN:$PATH"
  else
    export PATH="/opt/devtools/bin:$PATH"
    export GIT_EXEC_PATH="/opt/devtools/libexec/git-core"
    export CC=gcc
    export CXX=g++
    export PYTHON="/opt/devtools/bin/python3"

    echo "Using gcc version:"
    (which gcc && gcc --version)

    echo "Using g++ version:"
    (which g++ && g++ --version)
  fi
else
  export NODE_GYP_FORCE_PYTHON="C:\python\Python311\python.exe"
  export PATH="/cygdrive/c/python/Python311/Scripts:/cygdrive/c/python/Python311:/cygdrive/c/Python311/Scripts:/cygdrive/c/Python311:/cygdrive/c/cmake/bin:$PATH"
fi

NODE_JS_MAJOR_VERSION=$(echo "$NODE_JS_VERSION" | awk -F . '{print $1}')
if echo "$NODE_JS_MAJOR_VERSION" | grep -q '^[0-9]*$'; then
  export PATH="/opt/devtools/node$NODE_JS_MAJOR_VERSION/bin:$PATH"
  echo "Detected Node.js version (requested v${NODE_JS_MAJOR_VERSION}.x):"
  node -v
  node -v | grep -q "^v$NODE_JS_MAJOR_VERSION"
else
  echo "Cannot identify major version from NODE_JS_VERSION: $NODE_JS_VERSION"
  exit 1
fi

export EVERGREEN_EXPANSIONS_PATH="$BASEDIR/../../tmp/expansions.yaml"

if [ "$OS" == "Windows_NT" ]; then
  export EVERGREEN_EXPANSIONS_PATH="$(cygpath -w "$EVERGREEN_EXPANSIONS_PATH")"
fi

# On RHEL hosts, we run as root for some reason
if [ `uname` = Linux ]; then
    export npm_config_unsafe_perm=true
fi

# pnpm runs install scripts sequentially by default, avoiding the npm@7+
# parallel script execution issue where packages with diamond dependencies
# on node-addon-api (e.g. multiple addons depending on it) would fail to
# build on Windows when multiple scripts tried to build node-addon-api
# in the same directory simultaneously.
export npm_config_registry=https://registry.npmjs.org/
export npm_config_loglevel=verbose

mkdir -p "$PWD/../pnpm-logs"

export DOCKER_CONFIG="$BASEDIR/docker-config"
export PATH="$BASEDIR/docker-config/bin:$PATH"

echo "Running on:"
uname -a

echo "Full path:"
echo $PATH

echo "Using node version:"
(which node && node --version)

echo "Using npm version:"
(which npm && npm --version)

echo "Using pnpm version:"
(which pnpm && pnpm --version)

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
