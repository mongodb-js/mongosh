#!/bin/bash
set -e
set -x

npm run evergreen-release download-crypt-shared-library

ls -lhA dist
echo "pkg:generic/mongo_crypt_shared@$(cat dist/.mongosh_crypt_*.version)" >> dist/.purls.txt

cat dist/.purls.txt

set +x
echo "${ARTIFACTORY_PASSWORD}" | docker login artifactory.corp.mongodb.com --username "${ARTIFACTORY_USERNAME}" --password-stdin
set -x

trap_handler() {
  rm -f /tmp/kondukto_credentials.env
}
trap trap_handler ERR EXIT

docker pull artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0
docker run --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0 update \
  --purls /pwd/dist/.purls.txt --sbom-out /pwd/dist/.sbom-lite.json
docker run --env-file /tmp/kondukto_credentials.env --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0 augment \
  --repo mongodb-js/mongosh --branch ${KONDUKTO_BRANCH} --sbom-in /pwd/dist/.sbom-lite.json -sbom-out /pwd/dist/.sbom.json
