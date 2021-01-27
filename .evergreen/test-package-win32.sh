#!/usr/bin/env bash
curl -sSfL "$ARTIFACT_URL" > mongosh.zip
export ARTIFACT_PATH="$PWD/mongosh.zip"
(cd /cygdrive/c/Program\ Files/ && mkdir mongosh && cd mongosh && unzip "$ARTIFACT_PATH" && chmod -v +x bin/*)
export PATH="/cygdrive/c/Program Files/mongosh/bin:$PATH"
echo 'print("He" + "llo")' | mongosh --nodb | grep -q Hello
