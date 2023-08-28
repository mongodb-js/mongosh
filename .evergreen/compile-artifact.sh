#!/usr/bin/env bash
set -e
set -x

cd $(pwd)

source .evergreen/setup-env.sh

if uname -a | grep -q 'Linux.*x86_64'; then
  rm -rf "tmp/.sccache"
  mkdir -p "tmp/.sccache"
  curl -L https://github.com/mozilla/sccache/releases/download/0.2.13/sccache-0.2.13-x86_64-unknown-linux-musl.tar.gz | tar -C "tmp/.sccache" -xzvf - --strip=1 sccache-0.2.13-x86_64-unknown-linux-musl/sccache
  export CC="$PWD/tmp/.sccache/sccache gcc"
  export CXX="$PWD/tmp/.sccache/sccache g++"
fi

rm -rf /tmp/m && mkdir -pv /tmp/m # Node.js compilation can fail on long path prefixes
trap "rm -rf /tmp/m" EXIT
export TMP=/tmp/m
export TMPDIR=/tmp/m

if [ `uname` = Darwin ]; then
  # match what Node.js 20 does on their own builder machines
  export CFLAGS='-mmacosx-version-min=10.15'
  export CXXFLAGS='-mmacosx-version-min=10.15'
fi

# The CI machines we have for Windows and x64 macOS are not
# able to compile OpenSSL with assembly support,
# so we revert back to the slower version.
if [ "$OS" == "Windows_NT" ]; then
  export BOXEDNODE_CONFIGURE_ARGS='openssl-no-asm'
elif uname -a | grep -q 'Darwin.*x86_64'; then
  export BOXEDNODE_CONFIGURE_ARGS='--openssl-no-asm'
elif [ -n "$MONGOSH_SHARED_OPENSSL" ]; then
  pushd /tmp/m
  if [ "$MONGOSH_SHARED_OPENSSL" == "openssl11" ]; then
    curl -sSfLO https://www.openssl.org/source/openssl-1.1.1o.tar.gz
    MONGOSH_OPENSSL_LIBNAME=:libcrypto.so.1.1,:libssl.so.1.1
  elif [ "$MONGOSH_SHARED_OPENSSL" == "openssl3" ]; then
    curl -sSfLO https://www.openssl.org/source/openssl-3.0.5.tar.gz
    MONGOSH_OPENSSL_LIBNAME=:libcrypto.so.3,:libssl.so.3
  else
    echo "Unknown MONGOSH_SHARED_OPENSSL value: $MONGOSH_SHARED_OPENSSL"
    exit 1
  fi

  tar xzvf openssl-*.tar.gz  
  
  # pushd fails on RHEL8 because openssl-* expands to 2 different files. For example:
  # pushd openssl-1.1.1o openssl-1.1.1o.tar.gz
  # .evergreen/compile-artifact.sh: line 49: pushd: too many arguments
  # That is why is better to remove the .tar.gz once we are done with it.
  rm openssl-*.tar.gz
  pushd openssl-*
  ./config --prefix=/tmp/m/opt --libdir=lib shared
  make -j12
  make -j12 install install_ssldirs

  popd # openssl-*
  popd # /tmp/m

  export BOXEDNODE_CONFIGURE_ARGS='[
    "--shared-openssl",
    "--shared-openssl-includes=/tmp/m/opt/include",
    "--shared-openssl-libpath=/tmp/m/opt/lib",
    "--shared-openssl-libname='"$MONGOSH_OPENSSL_LIBNAME"'",
    "--shared-zlib"
  ]'
  export LD_LIBRARY_PATH=/tmp/m/opt/lib
fi

export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
npm run evergreen-release compile
dist/mongosh --version
dist/mongosh --build-info
dist/mongosh --build-info | grep -q '"distributionKind": "compiled"'

tar cvzf dist.tgz dist

source .evergreen/compilation-context-expansions.sh
