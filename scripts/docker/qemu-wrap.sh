#!/bin/bash
set -e
set -x
TARGET="$1"
PROC="$(uname -p)"

case "$PROC" in
  "aarch64")
    QEMU_CPU=cortex-a53
    ;;
  "x86_64")
    QEMU_CPU=qemu64
    ;;
  *)
    echo "Unknown processor type '$PROC'"
    exit 1
esac

mv -vn "$TARGET" "$TARGET.original"
cat << EOF > "$TARGET"
#!/bin/bash
exec "qemu-$PROC" -cpu "$QEMU_CPU" "$TARGET.original" "\$@"
EOF
chmod +x "$TARGET"
