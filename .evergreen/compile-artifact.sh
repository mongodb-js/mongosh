#!/usr/bin/env bash
set -e

cd $(pwd)

source .evergreen/setup-env.sh

if uname -a | grep -q 'Linux.*x86_64'; then
  rm -rf "tmp/.sccache"
  mkdir -p "tmp/.sccache"
  curl -L https://github.com/mozilla/sccache/releases/download/0.2.13/sccache-0.2.13-x86_64-unknown-linux-musl.tar.gz | tar -C "tmp/.sccache" -xzvf - --strip=1 sccache-0.2.13-x86_64-unknown-linux-musl/sccache
  export CC="$PWD/tmp/.sccache/sccache gcc"
  export CXX="$PWD/tmp/.sccache/sccache g++"
fi

export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
mkdir -pv /tmp/m # Node.js compilation can fail on long path prefixes
(env TMP=/tmp/m TMPDIR=/tmp/m npm run evergreen-release compile && rm -rf /tmp/m) || (rm -rf /tmp/m; false)
dist/mongosh --version
dist/mongosh --build-info
dist/mongosh --build-info | grep -q '"distributionKind": "compiled"'

tar cvzf dist.tgz dist
