#!/bin/bash
set -e
set -x

# This bash script expects FLE_NODE_SOURCE_PATH to be the path to a Node.js
# checkout which contains OpenSSL, and where the relevant headers and library
# files for the mongodb-client-encryption addon will be stored after
# compiling them.

# One thing that is not obvious from the build instructions for libmongocrypt
# and the Node.js bindings is that the Node.js driver uses libmongocrypt in
# DISABLE_NATIVE_CRYPTO aka nocrypto mode, that is, instead of using native
# system libraries for crypto operations, it provides callbacks to libmongocrypt
# which, in the Node.js addon case, call JS functions that in turn call built-in
# Node.js crypto methods.
# That’s way more convoluted than it needs to be, considering that we always
# have a copy of OpenSSL available directly, but for now it seems to make sense
# to stick with what the Node.js addon does here.

# This isn't a lot, but hopefully after https://jira.mongodb.org/browse/WRITING-7164
# we'll be able to simplify this further.

cd "$(dirname "$0")"/..
MONGOSH_ROOT_DIR="$PWD"
BUILDROOT="$MONGOSH_ROOT_DIR"/tmp/fle-buildroot
rm -rf "$BUILDROOT"
mkdir -p "$BUILDROOT"
cd "$BUILDROOT"
PREBUILT_OSNAME=''

[ -z "$LIBMONGOCRYPT_VERSION" ] && LIBMONGOCRYPT_VERSION=latest

echo Using libmongocrypt at git tag "$LIBMONGOCRYPT_VERSION"

if [ x"$FLE_NODE_SOURCE_PATH" != x"" -a -z "$BUILD_FLE_FROM_SOURCE" ]; then
  # Use prebuilt binaries where available.
  case `uname -a` in
      Darwin*x86_64*)                   PREBUILT_OSNAME=macos;;
      Linux*x86_64*)                    PREBUILT_OSNAME=rhel-70-64-bit;;
      Linux*s390x*)                     PREBUILT_OSNAME=rhel72-zseries-test;;
      Linux*aarch64*)                   PREBUILT_OSNAME=ubuntu1804-arm64;;
      Linux*ppc64le*)                   PREBUILT_OSNAME=rhel-71-ppc64el;;
      CYGWIN*|MINGW32*|MSYS*|MINGW*)    PREBUILT_OSNAME=windows-test;;
  esac
fi

if [ x"$PREBUILT_OSNAME" != x"" ]; then
  if [ $LIBMONGOCRYPT_VERSION != latest ]; then
    # Replace LIBMONGOCRYPT_VERSION through its git SHA
    git clone https://github.com/mongodb/libmongocrypt --branch $LIBMONGOCRYPT_VERSION --depth 2
    LIBMONGOCRYPT_VERSION=$(cd libmongocrypt && git rev-parse HEAD)
    rm -rf libmongocrypt
  fi

  # Download and extract prebuilt binaries.
  curl -sSfLO https://s3.amazonaws.com/mciuploads/libmongocrypt/$PREBUILT_OSNAME/master/$LIBMONGOCRYPT_VERSION/libmongocrypt.tar.gz
  if tar -tzf libmongocrypt.tar.gz lib64; then LIB=lib64; else LIB=lib; fi
  mkdir -p prebuilts
  tar -xzvf libmongocrypt.tar.gz -C prebuilts nocrypto/ $LIB/
  mkdir -p lib
  mv -v prebuilts/nocrypto/$LIB/* lib
  mv -v prebuilts/nocrypto/include include
  mv -v prebuilts/$LIB/*bson* lib
  rm -rf prebuilts
else
  if [ `uname` = Darwin ]; then
    export CFLAGS="-mmacosx-version-min=10.13";
  fi

  if [ -z "$CMAKE" ]; then CMAKE=cmake; fi

  # libmongocrypt currently determines its own version at build time by using
  # `git describe`, so there's no way to do anything but a full checkout of the
  # repository at this point.
  git clone https://github.com/mongodb/libmongocrypt
  if [ $LIBMONGOCRYPT_VERSION != "latest" ]; then
    (cd libmongocrypt && git checkout $LIBMONGOCRYPT_VERSION)
  fi

  # build libmongocrypt
  cd libmongocrypt
  mkdir -p cmake-build
  cd cmake-build
  "$CMAKE" -DCMAKE_INSTALL_PREFIX="$BUILDROOT" -DCMAKE_PREFIX_PATH="$BUILDROOT" -DDISABLE_NATIVE_CRYPTO=1 ..
  make -j8 install
  cd ../../
fi

if [ x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/lib
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv "$BUILDROOT"/lib*/*-static* "$FLE_NODE_SOURCE_PATH"/deps/lib
  cp -rv "$BUILDROOT"/include/*{kms,mongocrypt}* "$FLE_NODE_SOURCE_PATH"/deps/include
fi
