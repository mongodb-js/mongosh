#!/bin/sh

set -e
set -x

TEST_262_REPO=https://github.com/tc39/test262.git
TMP_DIR=/tmp
OUTPUT_DIR=tmp

TEST_DIR=$TMP_DIR/test262
TMP_TEST262_RESULT=$TMP_DIR/test262-result.json
PARSED_TEST262_RESULT=$OUTPUT_DIR/test262.test.json
TEST_PATTERN="$TEST_DIR/test/language/**/*.js"

rm -rf $TEST_DIR
mkdir -p $OUTPUT_DIR
npm run compile --workspace='packages/async-rewriter2'

git clone --depth=1 https://github.com/tc39/test262.git $TEST_DIR

SELF=$(pwd)
cd $TEST_DIR
python -m pip install --upgrade pip
pip install -r tools/generation/requirements.txt
npm install
./make.py clean >/dev/null
./make.py
cd $SELF

npx test262-harness \
    --timeout 1000 \
    --preprocessor scripts/test262-preprocessor-module.js \
    --reporter json \
    --reporter-keys "file,result,duration" \
    "$TEST_PATTERN" > $TMP_TEST262_RESULT

node scripts/test262-output-to-mocha.js $TMP_TEST262_RESULT $PARSED_TEST262_RESULT
