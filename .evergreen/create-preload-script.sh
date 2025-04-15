#! /usr/bin/env bash
set -e
set +x
cat <<PRELOAD_SCRIPT > preload.sh
echo "Preload script starting"
set -e
set -x
export ARTIFACT_URL=$(cat ../artifact-url.txt)
export IS_CI=1
set +x
export MONGOSH_SMOKE_TEST_SERVER="mongodb+srv://${connectivity_test_atlas_username}:${connectivity_test_atlas_password}@${connectivity_test_atlas_hostname}/"
echo "Preload script done"
set -x
PRELOAD_SCRIPT