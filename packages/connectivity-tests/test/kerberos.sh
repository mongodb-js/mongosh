#!/bin/bash
set -e
set -x

export KERBEROS_JUMPHOST_DOCKERFILE=${KERBEROS_JUMPHOST_DOCKERFILE:-Dockerfile.node20}

FAILED=no
# --abort-on-container-exit only fires once a container exits, so nothing bounds
# this if the image build stalls or the jumphost never terminates. Without a
# timeout that hangs until Evergreen's 2h exec timeout kills the whole task.
timeout 20m docker compose \
  -f "$TEST_TMPDIR/test-envs/docker/kerberos/docker-compose.yaml" \
  -f "$CONNECTIVITY_TEST_SOURCE_DIR/kerberos/docker-compose.kerberos.yaml" \
  --ansi never \
  --progress plain \
  up --build --exit-code-from kerberos_jumphost --abort-on-container-exit || FAILED=yes

docker compose \
  -f "$TEST_TMPDIR/test-envs/docker/kerberos/docker-compose.yaml" \
  -f "$CONNECTIVITY_TEST_SOURCE_DIR/kerberos/docker-compose.kerberos.yaml" \
  --ansi never \
  down -v

if [ $FAILED = yes ]; then
  exit 1
fi
