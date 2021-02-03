#!/usr/bin/env bash
if echo "$ARTIFACT_URL" | grep -f .zip; then
  curl -sSfL "$ARTIFACT_URL" > mongosh.zip
  export ARTIFACT_PATH="$PWD/mongosh.zip"
  (cd /cygdrive/c/Program\ Files/ && rm -rf mongosh && mkdir mongosh && cd mongosh && unzip "$ARTIFACT_PATH" && chmod -v +x bin/*)
else
  curl -sSfL "$ARTIFACT_URL" > mongosh.msi
  export ARTIFACT_PATH="$PWD/mongosh.msi"
  (cd /cygdrive/c/Program\ Files/ && rm -rf mongosh && mkdir mongosh && cd mongosh && msiexec /i /jm "$(cygpath -w "$ARTIFACT_PATH")" /qn && chmod -v +x bin/*)
fi
export PATH="/cygdrive/c/Program Files/mongosh/bin:$PATH"
mongosh --smokeTests
(cd /cygdrive/c/Program\ Files/ && rm -rf mongosh)
