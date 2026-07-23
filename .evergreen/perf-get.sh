#! /usr/bin/env bash

# Fetch raw performance results for a given Evergreen version/patch from the
# Signal Processing Service (SPS). This is the same data submitted by
# perf-send.sh; SPS exposes it read-only, keyed by version id, at:
#
#   GET ${PERF_API}/raw_perf_results/versions/<version-id>
#
# Reachability is network-gated (corp network / VPN), not token-authed.
#
# Usage:
#   .evergreen/perf-get.sh <version-id>
#
#   <version-id>  Evergreen version (or patch) id. This is the 'version' field
#                 embedded in the perf artifact filenames and the 'version_id'
#                 expansion of the run.
#
# Environment:
#   PERF_API  Override the base URL (default: the corp SPS endpoint).
#
# The raw JSON is written to stdout; filter it with jq as needed, e.g.:
#   .evergreen/perf-get.sh 6a617fb73e1d2a0007d3c6ca \
#     | jq '[.[] | select(.info.task_name | test("telemetry"))]'

set -euo pipefail

PERF_API="${PERF_API:-https://performance-monitoring-api.corp.mongodb.com}"

version_id="${1:-}"

if [ -z "$version_id" ]; then
  echo "usage: perf-get.sh <version-id>" >&2
  exit 2
fi

curl -sS -f -H 'accept: application/json' "${PERF_API}/raw_perf_results/versions/${version_id}"
