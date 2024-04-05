#!/usr/bin/env bash
set -e
set -x

export NODE_JS_VERSION=${NODE_JS_VERSION}
export ARTIFACT_URL_FILE="$PWD/../artifact-url.txt"

# TODO: Remove this once it is confirmed that it's safge to do so
#if [[ "$OS" == "Windows_NT" && "$PACKAGE_VARIANT" == "win32msi-x64" ]]; then
#  # We have to setup a python venv for the notary client to work
#  # in order to sign the MSI
#  export PATH="/cygdrive/c/Python27:/cygdrive/c/python/Python27:$PATH"
#  # python --version prints to stderr...
#  if [[ ! "$(python --version 2>&1 | tr -d '\r')" =~ "2.7" ]]; then
#    echo "FAIL: could not properly setup Python 2.7"
#    exit 1
#  fi
#
#  # These packages have to be installed for the notary client to work
#  python -m virtualenv .venv
#  cd .venv
#  # Activating venv on Windows is a little different
#  source Scripts/activate
#  pip install requests
#  pip install poster
#  # pycrypto does not install on Windows so we use pycryptodome
#  pip install pycryptodome
#  cd ..
#fi

source .evergreen/setup-env.sh

(mkdir -p dist/ && cd dist/ && bash "$BASEDIR/retry-with-backoff.sh" curl -sSfLO --url "$(cat "$ARTIFACT_URL_FILE")")
ls -lh dist/

if [ "$(uname)" == Darwin ]; then
  # https://wiki.corp.mongodb.com/display/BUILD/How+to+use+MacOS+notary+service
  # download macnotary client
  curl -LO https://macos-notary-1628249594.s3.amazonaws.com/releases/client/latest/darwin_amd64.zip
  unzip darwin_amd64.zip
  chmod +x ./darwin_amd64/macnotary
  ./darwin_amd64/macnotary -v

  FILE=$(echo ./dist/*.zip)
  echo "notarizing $FILE ..."

  # notarize the client
  ./darwin_amd64/macnotary \
    -f "$FILE" \
    -m notarizeAndSign -u https://dev.macos-notary.build.10gen.cc/api \
    -b com.mongodb.mongosh \
    -e config/macos-entitlements.xml \
    -o "$FILE-signed.zip"
  mv -v "$FILE-signed.zip" "$FILE"

  # Verify signing
  unzip "$FILE"
  spctl -a -vvv -t install mongosh-*/bin/mongosh
else
  npm run evergreen-release sign
fi

npm run evergreen-release upload
