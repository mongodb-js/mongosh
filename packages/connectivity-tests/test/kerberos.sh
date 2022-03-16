#!/bin/bash
set -e
set -x

FAILED=no
docker-compose \
  -f "$TEST_TMPDIR/test-envs/docker/kerberos/docker-compose.yaml" \
  -f "$CONNECTIVITY_TEST_SOURCE_DIR/kerberos/docker-compose.kerberos.yaml" \
  --no-ansi \
  up --exit-code-from kerberos_jumphost --abort-on-container-exit || FAILED=yes

docker-compose \
  -f "$TEST_TMPDIR/test-envs/docker/kerberos/docker-compose.yaml" \
  -f "$CONNECTIVITY_TEST_SOURCE_DIR/kerberos/docker-compose.kerberos.yaml" \
  --no-ansi \
  down -v

if [ $FAILED = yes ]; then
  exit 1
fi
