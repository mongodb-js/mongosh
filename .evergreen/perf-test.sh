#! /usr/bin/env bash

set -euxo pipefail

if [ "${MONGOSH_PERF_TELEMETRY:-}" = "1" ]; then
  rm -f telemetry-sink-endpoint.txt telemetry-sink-events.ldjson
  node .evergreen/telemetry-sink.mts telemetry-sink-endpoint.txt telemetry-sink-events.ldjson &
  echo $! > telemetry-sink.pid
  trap 'kill "$(cat telemetry-sink.pid)" 2>/dev/null || true' EXIT
  for _ in $(seq 1 50); do
    [ -s telemetry-sink-endpoint.txt ] && break
    sleep 0.2
  done
  [ -s telemetry-sink-endpoint.txt ] # fail if the sink never came up
  MONGOSH_TELEMETRY_ENDPOINT="$(cat telemetry-sink-endpoint.txt)"
  export MONGOSH_TELEMETRY_ENDPOINT
  export SSL_CERT_FILE="$PWD/packages/testing/certificates/ca.crt"
fi

# shellcheck disable=SC2016 # $MONGODB_URI is deliberately expanded by the inner shell, which mongodb-runner invokes with the URI in its environment
npx -y mongodb-runner exec -t standalone --version=7.0.x-enterprise -- \
  sh -c 'MONGOSH_SMOKE_TEST_SERVER="$MONGODB_URI" ./dist/mongosh --perfTests > perf_results.json'

if [ "${MONGOSH_PERF_TELEMETRY:-}" = "1" ]; then
  kill "$(cat telemetry-sink.pid)" || true
  echo "=== telemetry sink events (NDJSON) ==="
  cat telemetry-sink-events.ldjson
  echo "=== telemetry sink event summary ==="
  identify_count=$(grep -c '"event":"identify"' telemetry-sink-events.ldjson || true)
  connection_count=$(grep -c '"event":"new-connection"' telemetry-sink-events.ldjson || true)
  echo "identify=$identify_count new-connection=$connection_count"
  [ "$identify_count" -ge 100 ]
  [ "$connection_count" -ge 80 ]
fi
