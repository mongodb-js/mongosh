#! /usr/bin/env bash

set -e

# (Copied over from Compass - https://github.com/mongodb-js/compass/blob/b6fec9cbbb2c6949e9ece3fffe861c3f52e30a4f/.evergreen/retry-with-backoff.sh)
# Retries a command a with backoff.
#
# The retry count is given by ATTEMPTS (default 5), the
# initial backoff timeout is given by TIMEOUT in seconds
# (default 1.)
#
# Successive backoffs double the timeout.
function retry_with_backoff {
  local max_attempts=${ATTEMPTS-5}
  local timeout=${TIMEOUT-1}
  local attempt=0
  local exitCode=0

  while [[ $attempt -lt $max_attempts ]]
  do
    attempt_prompt=$(( attempt + 1 ))
    echo "retry_with_backoff: running '$*' - attempt n. ${attempt_prompt} ..."

    if "$@"; then
      exitCode=0
      break
    else
      exitCode=$?
    fi

    echo "retry_with_backoff: attempt failed! Retrying in ${timeout}.." 1>&2
    sleep "${timeout}"
    attempt=$(( attempt + 1 ))
    timeout=$(( timeout * 2 ))
  done

  if [[ $exitCode != 0 ]]
  then
    echo "retry_with_backoff: All attempts failed" 1>&2
  fi

  return $exitCode
}

retry_with_backoff "$@"
