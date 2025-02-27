set -e
set -x

# Building from source requires up to date toolchain in path
ROOT_DIR="$PWD"
EVGDIR="$ROOT_DIR/.evergreen"
NVM_DIR="$EVGDIR/.nvm"
ORIGINAL_PATH="${PATH}"

OS_ARCH="$(uname "-m")"
if [ "$OS_ARCH" = "ppc64le" ] || [ "$OS_ARCH" = "ppc64" ] ; then
    echo "[INFO] Choosing v4 because OS_ARCH is $OS_ARCH"
    export TOOLCHAIN_PATH='/opt/mongodbtoolchain/v4/bin'
else
    echo "[INFO] Choosing v3 because OS_ARCH is $OS_ARCH"
    export TOOLCHAIN_PATH='/opt/mongodbtoolchain/v3/bin'
fi
export PATH="$TOOLCHAIN_PATH:${ORIGINAL_PATH}"


if [ `uname` != Darwin ]; then
    export CC=gcc
    export CXX=g++

    echo "Using gcc version:"
    (which gcc && gcc --version)

    echo "Using g++ version:"
    (which g++ && g++ --version)
fi

NODE_JS_TARBALL_FILE="node-v${NODE_JS_VERSION}.tar.gz"
NODE_JS_TARBALL_PATH="${EVGDIR}/${NODE_JS_TARBALL_FILE}"
NODE_JS_SOURCE_URL="https://nodejs.org/download/release/v${NODE_JS_VERSION}/${NODE_JS_TARBALL_FILE}"
NODE_JS_SOURCE_PATH="${EVGDIR}/node-v${NODE_JS_VERSION}"
# We install our custom built node in nvm dir so its easier for rest of the
# scripts to simply do `nvm use`
NODE_JS_INSTALL_DIR="${NVM_DIR}/versions/node/v${NODE_JS_VERSION}"

echo "Using python3 version:"
(which python3 && python3 --version) || true

# Without enough allowed file descriptors the Node build fails
ulimit -n 4096

echo "Will install Node.js v${NODE_JS_VERSION}"

# Download and unpack node source
bash "$BASEDIR/retry-with-backoff.sh" curl -s --url "${NODE_JS_SOURCE_URL}" -o "${NODE_JS_TARBALL_PATH}"
tar xzvf "$NODE_JS_TARBALL_PATH" --directory "${EVGDIR}"

# Move into node source DIR
pushd "${NODE_JS_SOURCE_PATH}"

# Apply the patch for lazy importing bz2. We only apply the bz2 patch as of now
# but later, when needed, we can expand this to apply all the patches in the
# patch directory
patch -p1 < "${ROOT_DIR}/scripts/nodejs-patches/001-configure-bz2.patch"

./configure --prefix "${NODE_JS_INSTALL_DIR}"

ncpu=$(expr $(nproc 2> /dev/null || echo 5) - 1)
make "-j${ncpu}"
make "-j${ncpu}" install

popd
