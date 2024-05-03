#!/bin/bash
set -e
set -x
npm run evergreen-release download-crypt-shared-library
rm -vrf .sbom && mkdir -vp .sbom
npm run write-node-js-dep
npm run create-purls-file
cp .sbom/purls.txt dist/.purls.txt
echo "pkg:generic/mongo_crypt_shared@$(cat dist/.mongo_crypt_*.version)" >> dist/.purls.txt

cat dist/.purls.txt

set +x
docker login artifactory.corp.mongodb.com --username ${ARTIFACTORY_USERNAME} --password ${ARTIFACTORY_PASSWORD}
set -x

docker pull artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0
docker run --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:1.0 update \
  --purls /pwd/dist/.purls.txt --sbom_out /pwd/dist/.sbom.json
