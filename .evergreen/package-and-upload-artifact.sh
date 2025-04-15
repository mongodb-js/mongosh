#!/usr/bin/env bash
set -e
set -x

export NODE_JS_VERSION=${NODE_JS_VERSION}
export ARTIFACT_URL_FILE="$PWD/artifact-url.txt"

source .evergreen/setup-env.sh
tar xvzf dist.tgz

if [ "$(uname)" == Linux ]; then
  mkdir -p tmp
  cp "$(pwd)/../tmp/expansions.yaml" tmp/expansions.yaml
  (cd scripts/docker && bash "$BASEDIR/retry-with-backoff.sh" docker build -t rocky8-package -f rocky8-package.Dockerfile .)
  echo Starting Docker container packaging
  docker run \
    -e EVERGREEN_EXPANSIONS_PATH=/tmp/build/tmp/expansions.yaml \
    -e NODE_JS_VERSION \
    -e PACKAGE_VARIANT \
    -e ARTIFACT_URL_EXTRA_TAG \
    -e ARTIFACT_URL_FILE="/tmp/build/artifact-url.txt" \
    --rm -v $PWD:/tmp/build --network host rocky8-package \
    -c 'cd /tmp/build && npm run evergreen-release package && npm run evergreen-release upload'
else
  npm run evergreen-release package
  ls -lh dist/

  if [ "$OS" == "Windows_NT" ]; then
    # Fix absolute path before handing over to node
    export ARTIFACT_URL_FILE="$(cygpath -w "$ARTIFACT_URL_FILE")"
  fi
  npm run evergreen-release upload
fi

cp -v $PWD/artifact-url.txt $PWD/../artifact-url.txt
