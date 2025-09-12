#!/bin/sh

set -o errexit

MONGOSH_RELEASES_URL=https://downloads.mongodb.com/compass/mongosh.json

show_download_link() {
    echo >&2 "Download mongosh manually from:"
    echo >&2
    printf >&2 "\t%s\n", 'https://www.mongodb.com/try/download/shell'
}

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
        echo >&2 "❌ This script does not support this OS ($os)."
        show_download_link

        exit 1
esac

# normalize $arch:
case "$arch" in
    amd64|x64)
        arch=x86_64
        ;;
    aarch64)
        arch=arm64
        ;;
    *)
        # Use uname’s reported architecture in the jq query.
esac

jq_query=$(cat <<EOF
.versions[0].downloads[] |
select(
    .distro == "$os" and
    .arch == "$arch" and
    (has("sharedOpenssl") | not)
) |
.archive.url
EOF
)

url=$(curl -fsSL $MONGOSH_RELEASES_URL | jq -r "$jq_query")

if [ -z "$url" ]; then
    echo >&2 "❓ No download found for $os on $arch."
    show_download_link
    exit 1
fi

case "$ext" in
    zip)
        file=$(mktemp)

        echo "Downloading $url to $file …"
        trap 'rm -f "$file"' EXIT

        curl -fsSL "$url" > "$file"
        echo "Downloaded $ext file; extracting mongosh …"

        unzip -vj "$file" '*/bin/mongosh*'
        ;;
    tgz)
        echo "Downloading & extracting from $url …"

        curl -fsSL "$url" | tar -xzf - \
            --transform "s/.*\///" \
            --wildcards "**/bin/mongosh*" \
        | sed -E 's/^.*[/]//'

        ;;
    *)
        echo >&2 "Bad file extension: $ext"
        show_download_link
        exit 1
esac

echo "✅ Success! 'mongosh' and its crypto library are now saved in this directory."
