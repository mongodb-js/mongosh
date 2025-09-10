#!/bin/sh

set -o errexit

for tool in jq curl; do
    which "$tool" >/dev/null || {
        echo >&2 "This script requires '$tool'."
        exit 1
    }
done

os=$(uname -o | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)

case "$os" in
    *linux)
        ext=tgz
        os=linux
        ;;
    darwin)
        ext=zip
        ;;
    *)
        echo >&2 "This script does not support this OS ($os). Download mongosh manually."
        exit 1
esac

case "$arch" in
    amd64|x86_64)
        arch=x64
        ;;
    aarch64)
        arch=arm64
esac

urls=$(curl -fsSL https://api.github.com/repos/mongodb-js/mongosh/releases/latest | jq -r '.assets[] | .browser_download_url' | grep -v -e \.sig -e shared -e openssl)
url=$(printf "%s" "$urls" | grep "\-${os}-${arch}" ||:)

if [ -z "$url" ]; then
    cat <<EOL
No download found for $os on $arch; download manually.

URLs considered:
$urls
EOL
    exit 1
fi

case "$ext" in
    zip)
        file=$(mktemp)

        echo "Downloading $url to $file …"
        trap 'rm -f $file' EXIT

        curl -fsSL "$url" > "$file"
        echo "Downloaded $ext file; extracting mongosh …"

        unzip -j "$file" '*/mongosh'
        ;;
    tgz)
        echo "Downloading & extracting from $url …"

        curl -fsSL "$url" | tar -xzf - \
            --transform "s/.*\///" \
            --wildcards "**/mongosh"

        ;;
    *)
        echo >&2 "Bad file extension: $ext"
        exit 1
esac

echo "Success! 'mongosh' is now saved in this directory."
