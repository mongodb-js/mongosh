export DISTRO_UPLOADLIST_REGEX="^(rhel70|win|rhel81-power8|amazon2-arm64|macos)"

mkdir -p /tmp/extra
if ! [[ "$DISTRO_ID" =~ $DISTRO_UPLOADLIST_REGEX ]]; then
  echo "'$DISTRO_ID' will be disabled as it is not part of the DISTRO_UPLOADLIST_REGEX '$DISTRO_UPLOADLIST_REGEX'."
  echo "If you need the package DISTRO to be packaged and uploaded, change the DISTRO_UPLOADLIST_REGEX variable in .evergreen/compile-artifact.sh"
  echo 'extra_upload_tag: "-disabled"' > /tmp/extra/compiling-context.yml
  export IS_ENABLED=false
else
  echo "'$DISTRO_ID' is going to be package and upload as it matches the DISTRO_UPLOADLIST_REGEX."
  echo 'extra_upload_tag: ""' > /tmp/extra/compiling-context.yml
  export IS_ENABLED=true
fi
