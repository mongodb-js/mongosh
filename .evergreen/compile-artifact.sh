#!/usr/bin/env bash
set -e

cd $(pwd)

source .evergreen/.setup_env

if uname -a | grep -q 'Linux.*x86_64'; then
  rm -rf "tmp/.sccache"
  mkdir -p "tmp/.sccache"
  curl -L https://github.com/mozilla/sccache/releases/download/0.2.13/sccache-0.2.13-x86_64-unknown-linux-musl.tar.gz | tar -C "tmp/.sccache" -xzvf - --strip=1 sccache-0.2.13-x86_64-unknown-linux-musl/sccache
  export CC="$PWD/tmp/.sccache/sccache gcc"
  export CXX="$PWD/tmp/.sccache/sccache g++"
fi

if uname -p | sed -e 's/s390/matches/' -e 's/ppc/matches/' | grep -q matches; then
  # On s390x and PPC machines in evergreen, there is a Python 3.x installation
  # in /opt/mongodbtoolchain/v3/bin, but it's broken in the sense that its bz2
  # package cannot be loaded, which we need for building Node.js.
  # We therefore do some PATH wiggling here to make sure that the python
  # executable used by the Node.js configure script is python 2.x.
  # This is not a sustainable long-term solution, because Node.js drops Python 2
  # support for build scripts with Node.js 15 and above.
  # TODO: Open a build ticket about this, referencing patch/output from
  # https://spruce.mongodb.com/version/608ad4613e8e8601d5cd3d6f/tasks.
  rm -rf tmp/python-container
  mkdir -p tmp/python-container
  (cd tmp/python-container && ln -s /usr/bin/python python && ln -s python python2.7 && ln -s python python2)
  export PATH="$PWD/tmp/python-container:$PATH"
  export FORCE_PYTHON2=1

  echo "Using python version:"
  python --version
fi

export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
npm run evergreen-release compile
dist/mongosh --version
dist/mongosh --build-info
dist/mongosh --build-info | grep -q '"distributionKind": "compiled"'

tar cvzf dist.tgz dist
