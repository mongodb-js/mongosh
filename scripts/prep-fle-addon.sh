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

BUILDROOT="$(dirname "$0")"/../tmp/fle-buildroot
rm -rf "$BUILDROOT"
mkdir -p "$BUILDROOT"
cd "$BUILDROOT"
BUILDROOT="$PWD"
PREBUILT_OSNAME=''

if [ x"$FLE_NODE_SOURCE_PATH" != x"" -a -z "$BUILD_FLE_FROM_SOURCE" ]; then
  # Use prebuilt binaries for macOS and Windows. Linux builds are available,
  # but may not match the correct OpenSSL version that we end up linking
  # against.
  case `uname` in
      Darwin*)                          PREBUILT_OSNAME=macos;;
      CYGWIN*|MINGW32*|MSYS*|MINGW*)    PREBUILT_OSNAME=windows-test;;
  esac
fi

if [ x"$PREBUILT_OSNAME" != x"" ]; then
  # Download and extract prebuilt binaries.
  curl -LO https://s3.amazonaws.com/mciuploads/libmongocrypt/all/master/latest/libmongocrypt-all.tar.gz
  tar --strip-components=2 -xzvf libmongocrypt-all.tar.gz "$PREBUILT_OSNAME/nocrypto/"
  tar --strip-components=1 -xzvf libmongocrypt-all.tar.gz "$PREBUILT_OSNAME/lib/libbson-static-1.0.a"
else
  if [ `uname` = Darwin ]; then
    export CFLAGS="-mmacosx-version-min=10.13";
  fi

  if [ -z "$CMAKE" ]; then CMAKE=cmake; fi

  # libmongocrypt currently determines its own version at build time by using
  # `git describe`, so there's no way to do anything but a full checkout of the
  # repository at this point.
  git clone https://github.com/mongodb/mongo-c-driver
  git clone https://github.com/mongodb/libmongocrypt

  # build libbson
  cd mongo-c-driver
  mkdir -p cmake-build
  cd cmake-build
  "$CMAKE" -DCMAKE_INSTALL_PREFIX="$BUILDROOT" -DCMAKE_PREFIX_PATH="$BUILDROOT" -DENABLE_MONGOC=OFF ..
  make -j8 install
  cd ../../

  # build libmongocrypt
  cd libmongocrypt
  mkdir -p cmake-build
  cd cmake-build
  "$CMAKE" -DCMAKE_INSTALL_PREFIX="$BUILDROOT" -DCMAKE_PREFIX_PATH="$BUILDROOT" -DENABLE_MONGOC=OFF -DDISABLE_NATIVE_CRYPTO=1 ..
  make -j8 install
  cd ../../
fi

if [ x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/lib
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv "$BUILDROOT"/lib/*-static* "$FLE_NODE_SOURCE_PATH"/deps/lib
  cp -rv "$BUILDROOT"/include/*{kms,mongocrypt}* "$FLE_NODE_SOURCE_PATH"/deps/include
fi
