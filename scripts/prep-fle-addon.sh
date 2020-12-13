#!/bin/bash
set -e
set -x

# This bash script expects FLE_NODE_SOURCE_PATH to be the path to a Node.js
# checkout which contains OpenSSL, and where the relevant headers and library
# files for the mongodb-client-encryption addon will be stored after
# compiling them.

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
  curl -L https://s3.amazonaws.com/mciuploads/libmongocrypt/all/master/latest/libmongocrypt-all.tar.gz | \
    tar --strip-components=1 -xzvf - $PREBUILT_OSNAME
else
  if [ `uname` = Darwin ]; then
    export CFLAGS="-mmacosx-version-min=10.13";
  fi

  if [ `uname` = Linux -a x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
    # Build a copy of the Node.js bundled OpenSSL package and install it locally
    # so that libmongocrypt is built against the right version of it.
    # If we wanted to, we could probably adjust the libmongocrypt build config
    # to enable static-library-only builds, which would then only require the
    # OpenSSL *headers* to be present, rather than the compiled libraries as
    # well (which is currently the case).
    cp -r "$FLE_NODE_SOURCE_PATH"/deps/openssl/openssl .
    (cd openssl && ./config --prefix="$BUILDROOT" && make -j8 && make -j8 install)
    export CMAKE_EXTRA_ARGS="-DOPENSSL_ROOT_DIR=$BUILDROOT -DOPENSSL_INCLUDE_DIR=$BUILDROOT/include -DOPENSSL_LIBRARIES=$BUILDROOT/lib"
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
fi

if [ x"$FLE_NODE_SOURCE_PATH" != x"" ]; then
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/lib
  mkdir -p "$FLE_NODE_SOURCE_PATH"/deps/include
  cp -rv "$BUILDROOT"/lib/*-static* "$FLE_NODE_SOURCE_PATH"/deps/lib
  cp -rv "$BUILDROOT"/include/*{kms,mongocrypt}* "$FLE_NODE_SOURCE_PATH"/deps/include
fi
