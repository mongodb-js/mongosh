#!/bin/bash
set -e
set -x

# This isn't a lot, but hopefully after https://jira.mongodb.org/browse/WRITING-7164
# we'll be able to simplify this further.

BUILDROOT="$(dirname "$0")"/../tmp/fle-buildroot
rm -rf "$BUILDROOT"
mkdir -p "$BUILDROOT"
cd "$BUILDROOT"
BUILDROOT="$PWD"

if [ `uname` = Darwin ]; then
  export CFLAGS="-mmacosx-version-min=10.13";
fi

if [ `uname` = Linux -a x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  cp -r "$FLE_NODE_SOURCE_PATH"/deps/openssl/openssl .
  (cd openssl && ./config --prefix="$BUILDROOT" && make -j8 && make -j8 install)
  export CMAKE_EXTRA_ARGS="-DOPENSSL_ROOT_DIR=$BUILDROOT -DOPENSSL_INCLUDE_DIR=$BUILDROOT/include -DOPENSSL_LIBRARIES=$BUILDROOT/lib"
fi

if [ -z "$CMAKE" ]; then CMAKE=cmake; fi

git clone https://github.com/mongodb/mongo-c-driver
git clone https://github.com/mongodb/libmongocrypt

# build libbson
cd mongo-c-driver
mkdir -p cmake-build
cd cmake-build
"$CMAKE" -DCMAKE_INSTALL_PREFIX="$BUILDROOT" -DCMAKE_PREFIX_PATH="$BUILDROOT" -DENABLE_MONGOC=OFF $CMAKE_EXTRA_ARGS ..
make -j8 install
cd ../../

# build libmongocrypt
cd libmongocrypt
mkdir -p cmake-build
cd cmake-build
"$CMAKE" -DCMAKE_INSTALL_PREFIX="$BUILDROOT" -DCMAKE_PREFIX_PATH="$BUILDROOT" -DENABLE_MONGOC=OFF $CMAKE_EXTRA_ARGS ..
make -j8 install
cd ../../

if [ x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/lib
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv "$BUILDROOT"/lib/*-static* "$FLE_NODE_SOURCE_PATH"/deps/lib
  cp -rv "$BUILDROOT"/include/*{kms,bson,mongocrypt}* "$FLE_NODE_SOURCE_PATH"/deps/include
fi
