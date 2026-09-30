#!/bin/bash
set -e
set -x

npm run evergreen-release download-crypt-shared-library

ls -lhA dist
echo "pkg:generic/mongo_crypt_shared@$(cat dist/.mongosh_crypt_*.version)" >> dist/.purls.txt

cat dist/.purls.txt

ECR_HOST=901841024863.dkr.ecr.us-east-1.amazonaws.com
SILKBOMB_IMAGE="${ECR_HOST}/release-infrastructure/silkbomb:2.0"

set +x
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${ECR_HOST}"
set -x

trap_handler() {
  rm -f /tmp/kondukto_credentials.env
}
trap trap_handler ERR EXIT

docker pull "${SILKBOMB_IMAGE}"
docker run --rm -v ${PWD}:/pwd "${SILKBOMB_IMAGE}" update \
  --purls /pwd/dist/.purls.txt --sbom-out /pwd/dist/.sbom-lite.json
docker run --env-file /tmp/kondukto_credentials.env --rm -v ${PWD}:/pwd "${SILKBOMB_IMAGE}" augment \
  --repo mongodb-js/mongosh --branch ${KONDUKTO_BRANCH} --sbom-in /pwd/dist/.sbom-lite.json --sbom-out /pwd/dist/.sbom.json
