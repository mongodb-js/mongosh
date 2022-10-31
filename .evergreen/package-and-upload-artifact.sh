#!/usr/bin/env bash
set -e
set -x

export NODE_JS_VERSION=${NODE_JS_VERSION}
export ARTIFACT_URL_FILE="$PWD/artifact-url.txt"
export DEBUG="node-codesign,\$DEBUG"

source .evergreen/setup-env.sh
tar xvzf dist.tgz

if [ "$(uname)" == Linux ]; then
  mkdir -p tmp
  cp "$(pwd)/../tmp/expansions.yaml" tmp/expansions.yaml
  (cd scripts/docker && docker build -t rocky8-package -f rocky8-package.Dockerfile .)
  echo Starting Docker container packaging
  docker run -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD \
    -e EVERGREEN_EXPANSIONS_PATH=/tmp/build/tmp/expansions.yaml \
    -e NODE_JS_VERSION \
    -e PACKAGE_VARIANT \
    -e ARTIFACT_URL_FILE="/tmp/build/artifact-url.txt" \
    --rm -v $PWD:/tmp/build --network host rocky8-package \
    -c 'cd /tmp/build && npm run evergreen-release package && npm run evergreen-release upload'
else
  if [[ "$OS" == "Windows_NT" && "$PACKAGE_VARIANT" == "win32msi-x64" ]]; then
    # We have to setup a python venv for the notary client to work
    # in order to sign the MSI
    export PATH="/cygdrive/c/Python27:/cygdrive/c/python/Python27:$PATH"
    # python --version prints to stderr...
    if [[ ! "$(python --version 2>&1 | tr -d '\r')" =~ "2.7" ]]; then
      echo "FAIL: could not properly setup Python 2.7"
      exit 1
    fi

    # These packages have to be installed for the notary client to work
    python -m virtualenv .venv
    cd .venv
    # Activating venv on Windows is a little different
    source Scripts/activate
    pip install requests
    pip install poster
    # pycrypto does not install on Windows so we use pycryptodome
    pip install pycryptodome
    cd ..
  fi

  npm run evergreen-release package
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
  fi

  if [ "$OS" == "Windows_NT" ]; then
    # Fix absolute path before handing over to node
    export ARTIFACT_URL_FILE="$(cygpath -w "$ARTIFACT_URL_FILE")"
  fi
  npm run evergreen-release upload
fi
