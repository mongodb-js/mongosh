#!/bin/sh

set -e
set -x

TEST_262_REPO=https://github.com/tc39/test262.git
TMP_DIR=/tmp
OUTPUT_DIR=tmp/

TEST_DIR=$TMP_DIR/test262
TMP_TEST262_DIR=$OUTPUT_DIR/test262-in/
OUT_TEST262_DIR=$OUTPUT_DIR/test262-out/

rm -rf $TEST_DIR
rm -rf $OUTPUT_DIR
mkdir -p $OUTPUT_DIR
mkdir -p $TMP_TEST262_DIR
mkdir -p $OUT_TEST262_DIR

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

for TEST_SUBDIR in $(find $TEST_DIR/test/ -type f -name "*.js" -printf '%h\n' | sort -u | grep -v '^\.$');
do
    TEST_FILE=$(echo "${TEST_SUBDIR}.json" | sed 's/\//_/g')
    TEST_PATTERN="$TEST_SUBDIR/*.js"

    echo "OUTPUT_TO=$TMP_TEST262_DIR/$TEST_FILE"
    npx test262-harness \
    	--timeout 1000 \
    	--preprocessor scripts/test262-preprocessor-module.js \
    	--reporter json \
    	--reporter-keys "file,result,duration" \
    	"$TEST_PATTERN" > "$TMP_TEST262_DIR/$TEST_FILE"
done;

for TESTIN in $(find $TMP_TEST262_DIR -type f -name "*.json");
do
    if $(jq empty $TESTIN >/dev/null 2>&1) ;
    then
	TESTOUT="$OUT_TEST262_DIR/$(basename $TESTIN)"
	node scripts/test262-output-to-mocha.js $TESTIN $TESTOUT
    else
	echo "[ERROR] Could not parse $TESTIN, it seems to be an invalid JSON."
    fi
done;
