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

[ -z "$MONGODB_CLIENT_ENCRYPTION_VERSION" ] && MONGODB_CLIENT_ENCRYPTION_VERSION=main

echo Using mongodb-client-encryption at git tag "$MONGODB_CLIENT_ENCRYPTION_VERSION"

git clone https://github.com/mongodb-js/mongodb-client-encryption --branch "$MONGODB_CLIENT_ENCRYPTION_VERSION" --depth 2

cd mongodb-client-encryption

unset IS_WINDOWS
case $(uname -a) in
  CYGWIN*|MINGW32*|MSYS*|MINGW*) IS_WINDOWS="true";;
esac

if [[ $IS_WINDOWS == "true" ]]; then
  CMAKE_VERSION="3.25.1"
  archive="cmake-$CMAKE_VERSION-windows-x86_64.zip"
  url="https://github.com/Kitware/CMake/releases/download/v$CMAKE_VERSION/cmake-$CMAKE_VERSION-windows-x86_64.zip"
  extract_dir="cmake_$CMAKE_VERSION"
  curl --retry 5 -LsS --max-time 120 --fail --output "$archive" "$url"
  unzip -o -qq "$archive" -d "cmake_$CMAKE_VERSION"
  mv -- $extract_dir/cmake-$CMAKE_VERSION-*/* "$extract_dir"
  chmod +x $extract_dir/bin/*

  PATH=$PWD/$extract_dir/bin:$PATH
  export PATH
  hash -r
  which cmake
  cmake --version
fi

# The script in `mongodb-js/mongodb-client-encryption` will download or build the libmongocrypt version specified in
# mongodb-client-encryption's package.json at "mongodb:libmongocrypt"
npm run install:libmongocrypt -- --skip-bindings ${IS_WINDOWS:+--build}

# The "deps" directory will be populated
# Structure:
# deps/
#   include/kms_message
#   include/mongocrypt
# lib/
#   libbson-static-for-libmongocrypt.a
#   libkms_message-static.a
#   libmongocrypt-static.a

if [ x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/lib
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv ./deps/lib*/*-static* "$FLE_NODE_SOURCE_PATH"/deps/lib
  cp -rv ./deps/include/*kms* "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv ./deps/include/*mongocrypt* "$FLE_NODE_SOURCE_PATH"/deps/include
fi
