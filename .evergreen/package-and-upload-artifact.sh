#!/usr/bin/env bash
set -e

cat <<RELEASE_MONGOSH > ~/release_mongosh.sh
set -e
cd $(pwd)
export NODE_JS_VERSION=${NODE_JS_VERSION}
source .evergreen/.setup_env
tar xvzf dist.tgz
dist/mongosh --version
if [ "$(uname)" == Linux ]; then
  mkdir -p tmp
  cp "$(pwd)/../tmp/expansions.yaml" tmp/expansions.yaml
  (cd scripts/docker && docker build -t centos7-package -f centos7-package.Dockerfile .)
  echo Starting Docker container packaging
  docker run -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD \
    -e EVERGREEN_EXPANSIONS_PATH=/tmp/build/tmp/expansions.yaml \
    -e NODE_JS_VERSION \
    -e BUILD_VARIANT \
    --rm -v $PWD:/tmp/build --network host centos7-package \
    -c 'cd /tmp/build && npm run evergreen-release package && npm run evergreen-release upload'
else
  npm run evergreen-release package
  if [ "$(uname)" == Darwin ]; then
    # Verify signing
    spctl -a -vvv -t install dist/mongosh
  fi
  npm run evergreen-release upload
fi
RELEASE_MONGOSH

if [ "$(uname)" == Darwin ]; then
  # Using this trick to prevent any issues with macOS signing
  # Using the SSH session makes signing non-interactive
  ssh -v -p 2222 localhost "bash ~/release_mongosh.sh"
else
  bash ~/release_mongosh.sh
fi
