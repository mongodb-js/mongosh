#!/bin/bash
set -e
set -x

export KERBEROS_JUMPHOST_DOCKERFILE=${KERBEROS_JUMPHOST_DOCKERFILE:-Dockerfile.node20}

COMPOSE_FILES=(
  -f "$TEST_TMPDIR/test-envs/docker/kerberos/docker-compose.yaml"
  -f "$CONNECTIVITY_TEST_SOURCE_DIR/kerberos/docker-compose.kerberos.yaml"
)

FAILED=yes
for attempt in 1 2 3; do
  echo "[kerberos-test] docker compose up attempt $attempt/3"
  if docker compose "${COMPOSE_FILES[@]}" --no-ansi \
      up --build --exit-code-from kerberos_jumphost --abort-on-container-exit; then
    FAILED=no
    break
  fi
  # Tear down before retrying so stale containers / volumes don't interfere.
  docker compose "${COMPOSE_FILES[@]}" --no-ansi down -v 2>/dev/null || true
  if [ "$attempt" -lt 3 ]; then
    sleep $((attempt * 5))
  fi
done

docker compose "${COMPOSE_FILES[@]}" --no-ansi down -v

if [ $FAILED = yes ]; then
  exit 1
fi
