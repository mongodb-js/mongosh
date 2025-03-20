#!/usr/bin/env bash
set -e
set -x

# Use tmp directory for all gpg operations/the rpm database
GPG_HOME=$(mktemp -d)
TMP_FILE=$(mktemp)
MONGOSH_KEY="https://pgp.mongodb.com/mongosh.asc"
ARTIFACTS_DIR="dist"

trap_handler() {
  local code=$?
  if [ $code -eq 0 ]; then
    echo "Verification successful"
  else
    echo "Verification failed with exit code $code"
    cat "$TMP_FILE"
  fi
  rm -f "$TMP_FILE"
  rm -rf "$GPG_HOME"
  exit $code
}

trap trap_handler ERR EXIT

verify_using_gpg() {
  echo "Verifying $1 using gpg"
  gpg --homedir $GPG_HOME --verify $ARTIFACTS_DIR/$1.sig $ARTIFACTS_DIR/$1 > "$TMP_FILE" 2>&1
}

verify_using_powershell() {
  echo "Verifying $1 using powershell"
  powershell Get-AuthenticodeSignature -FilePath $ARTIFACTS_DIR/$1 > "$TMP_FILE" 2>&1

  # Get-AuthenticodeSignature just outputs text, it doesn't exit with a non-zero
  # code if the file is not signed
  if grep -q NotSigned "$TMP_FILE"; then
    echo "File $1 is not signed"
    exit 1
  fi
}

verify_using_codesign() {
  echo "Verifying $1 using codesign"
  codesign -dv --verbose=4 $ARTIFACTS_DIR/$1 > "$TMP_FILE" 2>&1
}

verify_using_rpm() {
  # RPM packages are signed using gpg and the signature is embedded in the package.
  # Here, we need to import the key in `rpm` and then verify the signature.
  echo "Importing key into rpm"
  rpm --dbpath "$GPG_HOME" --import $MONGOSH_KEY > "$TMP_FILE" 2>&1
  # Even if the file is not signed, the command below will exit with 0 and output something like: digests OK
  # So we need to check the output of the command to see if the file is signed successfully.
  echo "Verifying $1 using rpm"
  output=$(rpm --dbpath "$GPG_HOME" -K $ARTIFACTS_DIR/$1)

  # Check if the output contains the string "digests signatures OK"
  if [[ $output != *"digests signatures OK"* ]]; then
    echo "File $1 is not signed"
    exit 1
  fi
}

setup_gpg() {
  echo "Importing mongosh public key"
  curl $MONGOSH_KEY | gpg --homedir $GPG_HOME --import > "$TMP_FILE" 2>&1
}

BASEDIR="$PWD/.evergreen"
ARTIFACT_URL_FILE="$PWD/../artifact-url.txt"

echo "Downloading artifact from URL: $(cat $ARTIFACT_URL_FILE)"
(mkdir -p "$ARTIFACTS_DIR" && cd "$ARTIFACTS_DIR" && bash "$BASEDIR/retry-with-backoff.sh" curl -sSfLO --url "$(cat "$ARTIFACT_URL_FILE")")
ls -lh "$ARTIFACTS_DIR"

ARTIFACT_FILE_NAME=$(basename $(cat "$ARTIFACT_URL_FILE"))

if [[ $ARTIFACT_FILE_NAME == *.dmg ]]; then
  verify_using_codesign $ARTIFACT_FILE_NAME
elif [[ $ARTIFACT_FILE_NAME == *.msi ]] || [[ $ARTIFACT_FILE_NAME == *.exe ]]; then
  verify_using_powershell $ARTIFACT_FILE_NAME
else
  # If we are on windows or mac, we skip the gpg verification
  # 1. Windows because it requires gpg setup
  # 2. MacOS as the archives are not signed but the contents of the zip are signed
  #    (check './sign-packaged-artifact.sh') and hence we don't have any .sig file.
  if [[ $OSTYPE == "cygwin" ]] || [[ $OSTYPE == "darwin"* ]]; then
    echo "Skipping GPG verification on {$OSTYPE}"
    exit 0
  fi

  setup_gpg
  if [[ $ARTIFACT_FILE_NAME == *.rpm ]]; then
    verify_using_rpm $ARTIFACT_FILE_NAME
  else
    echo "Downloading the GPG signature file"
    (cd "$ARTIFACTS_DIR" && bash "$BASEDIR/retry-with-backoff.sh" curl -sSfLO --url "$(cat "$ARTIFACT_URL_FILE").sig")
    verify_using_gpg $ARTIFACT_FILE_NAME
  fi
fi
