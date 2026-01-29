export DISTRO_UPLOADLIST_REGEX="^(rhel70|win|rhel7-zseries|rhel8-power|amazon2-arm64|macos-12|macos-13|macos-14)"
export COMPILING_CONTEXT_FILE="$(pwd)/../tmp/compiling-context.yml"
mkdir -p $(dirname $COMPILING_CONTEXT_FILE)

if ! [[ "$DISTRO_ID" =~ $DISTRO_UPLOADLIST_REGEX ]]; then
  echo "'$DISTRO_ID' will be disabled as it is not part of the DISTRO_UPLOADLIST_REGEX '$DISTRO_UPLOADLIST_REGEX'."
  echo "If you need the enable '$DISTRO_ID', include it into the DISTRO_UPLOADLIST_REGEX variable in .evergreen/compile-artifact.sh"
  echo 'extra_upload_tag: "-disabled"' > "$COMPILING_CONTEXT_FILE"
  export IS_ENABLED=false
else
  echo "'$DISTRO_ID' is going to be enabled it matches the DISTRO_UPLOADLIST_REGEX."
  echo 'extra_upload_tag: ""' > "$COMPILING_CONTEXT_FILE"
  export IS_ENABLED=true
fi
