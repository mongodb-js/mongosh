#!/bin/bash
set -e
set -x

npm run evergreen-release download-crypt-shared-library

ls -lhA dist
echo "pkg:generic/mongo_crypt_shared@$(cat dist/.mongosh_crypt_*.version)" >> dist/.purls.txt

cat dist/.purls.txt

set +x
echo "${ARTIFACTORY_PASSWORD}" | docker login artifactory.corp.mongodb.com --username "${ARTIFACTORY_USERNAME}" --password-stdin
cat << EOF > silkbomb.env
SILK_CLIENT_ID=${SILK_CLIENT_ID}
SILK_CLIENT_SECRET=${SILK_CLIENT_SECRET}
EOF
set -x

trap_handler() {
  rm -f silkbomb.env
}
trap trap_handler ERR EXIT

docker pull artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0
docker run --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0 update \
  --purls /pwd/dist/.purls.txt --sbom-out /pwd/dist/.sbom-lite.json
docker run --env-file silkbomb.env --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0 upload \
  --silk-asset-group "${SILK_ASSET_GROUP}" --sbom-in /pwd/dist/.sbom-lite.json
docker run --env-file silkbomb.env --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0 download \
  --silk-asset-group "${SILK_ASSET_GROUP}" --sbom-out /pwd/dist/.sbom.json
