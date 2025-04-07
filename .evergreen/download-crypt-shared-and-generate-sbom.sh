#!/bin/bash
set -e
set -x

npm run evergreen-release download-crypt-shared-library

set +x
echo "${ARTIFACTORY_PASSWORD}" | docker login artifactory.corp.mongodb.com --username "${ARTIFACTORY_USERNAME}" --password-stdin
set -x

trap_handler() {
  rm -f /tmp/kondukto_credentials.env
}
trap trap_handler ERR EXIT

ls -lhA dist/.sbom

for dir in dist/.sbom/*/; do
  purls_file="${dir}purls.txt"
  if [ -f "$purls_file" ]; then
    echo "pkg:generic/mongo_crypt_shared@$(cat dist/.mongosh_crypt_*.version)" >>"$purls_file"
  fi

  cat ${purls_file}

  docker pull artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0
  docker run --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0 update \
    --purls /pwd/${purls_file} --sbom-out /pwd/${dir}sbom-lite.json
  docker run --env-file /tmp/kondukto_credentials.env --rm -v ${PWD}:/pwd artifactory.corp.mongodb.com/release-tools-container-registry-public-local/silkbomb:2.0 augment \
    --repo mongodb-js/mongosh --branch ${KONDUKTO_BRANCH} --sbom-in /pwd/${dir}sbom-lite.json --sbom-out /pwd/${dir}sbom.json
done
