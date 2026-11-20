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

# Succeeds when the dotted version $1 is greater than $2.
version_gt() {
  awk -v a="$1" -v b="$2" 'BEGIN {
    na = split(a, A, "."); nb = split(b, B, ".");
    for (i = 1; i <= 3; i++) {
      ai = (i <= na ? A[i] : 0) + 0;
      bi = (i <= nb ? B[i] : 0) + 0;
      if (ai > bi) exit 0;
      if (ai < bi) exit 1;
    }
    exit 1;
  }'
}

macho_minimum_macos_version() {
  local output minos
  output=$(vtool -show-build "$1" 2>/dev/null) || return 1
  minos=$(printf '%s\n' "$output" | awk '/^[[:space:]]*minos /{ print $2; exit }')
  if [ -z "$minos" ]; then
    # Binaries built with older toolchains record LC_VERSION_MIN_MACOSX instead.
    minos=$(printf '%s\n' "$output" | awk '/LC_VERSION_MIN_MACOSX/{ found = 1 } found && /^[[:space:]]*version /{ print $2; exit }')
  fi
  printf '%s' "$minos"
}

# mongosh 3.x supports macOS 15 and newer. Every Mach-O file in the archive
# must therefore be loadable on 15, and the executable itself must declare
# exactly that minimum so that lowering the deployment target in
# compile-artifact.sh cannot silently widen our supported platform range.
assert_macos_deployment_target() {
  local archive="$1" expected="$2"
  local extract_dir rc=0 candidate relative minos
  extract_dir=$(mktemp -d)
  unzip -q "$ARTIFACTS_DIR/$archive" -d "$extract_dir"

  while IFS= read -r candidate; do
    if ! file "$candidate" | grep -q 'Mach-O'; then
      continue
    fi
    relative="${candidate#"$extract_dir"/}"
    minos=$(macho_minimum_macos_version "$candidate")
    if [ -z "$minos" ]; then
      echo "ERROR: cannot determine the minimum macOS version of $relative"
      rc=1
      continue
    fi
    echo "$relative requires macOS $minos"
    if version_gt "$minos" "$expected"; then
      echo "ERROR: $relative requires macOS $minos, which is newer than the supported minimum $expected"
      rc=1
    elif [[ "$relative" == */bin/mongosh ]] && version_gt "$expected" "$minos"; then
      echo "ERROR: $relative targets macOS $minos, expected exactly $expected"
      rc=1
    fi
  done < <(find "$extract_dir" -type f)

  rm -rf "$extract_dir"
  return $rc
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
    if [[ $OSTYPE == "darwin"* ]] && [[ $ARTIFACT_FILE_NAME == *.zip ]]; then
      assert_macos_deployment_target "$ARTIFACT_FILE_NAME" "15.0"
    fi
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
