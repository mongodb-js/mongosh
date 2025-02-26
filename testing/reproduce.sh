# This file is not meant to be included, just a script to reproduce the issue like in evergreen.

(cd scripts/docker && docker build -t ubuntu24.04-xvfb -f ubuntu24.04-xvfb.Dockerfile .)
docker run \
    --rm -v $PWD:/tmp/build ubuntu24.04-xvfb \
    -c 'cd /tmp/build && ./testing/test-vscode.sh'
