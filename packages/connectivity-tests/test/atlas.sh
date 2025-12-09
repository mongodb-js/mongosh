#!/bin/bash
set -e
# To avoid username and password variables showing up in the logs
set +x

echo "Exporting secrets ..."

eval $(
  node "${MONGOSH_ROOT_DIR}/scripts/print-expansions.js" \
    connectivity_test_data_lake_hostname \
    connectivity_test_atlas_hostname \
    connectivity_test_atlas_username \
    connectivity_test_atlas_password
)

ATLAS_USERNAME="${CONNECTIVITY_TEST_ATLAS_USERNAME}"
ATLAS_PASSWORD="${CONNECTIVITY_TEST_ATLAS_PASSWORD}"
ATLAS_HOSTNAME="${CONNECTIVITY_TEST_ATLAS_HOSTNAME}"
ATLAS_DATA_LAKE_HOSTNAME="${CONNECTIVITY_TEST_DATA_LAKE_HOSTNAME}"

if
  [[ -z "${ATLAS_USERNAME}" ]] ||
    [[ -z "${ATLAS_PASSWORD}" ]] ||
    [[ -z "${ATLAS_HOSTNAME}" ]] ||
    [[ -z "${ATLAS_DATA_LAKE_HOSTNAME}" ]]
then
  echo "Atlas credentials are not provided"

  if [[ -n "${IS_CI}" ]] || [[ -n "${CI}" ]]; then
    exit 1
  else
    exit 0
  fi
fi

FAILED=no

# convertShardKeyToHashed() may seem weird to include here, but it's the best
# way to make sure that it works in our standard environments we connect to
CONNECTION_STATUS_COMMAND='convertShardKeyToHashed("asdf");db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers'
CONNECTION_STATUS_CHECK_STRING="user: '${ATLAS_USERNAME}'"

function check_failed() {
  if [[ $FAILED != no ]]; then
    printf "FAILED:\n"
    printf "  ${FAILED}\n"
    exit 1
  else
    printf "OK\n"
  fi
}

function test_connection_string() {
  printf "test_connection_string ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" | "${MONGOSH}" "${CONNECTION_STRING}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string with username and password"

  check_failed
}

function test_connection_string_fqdn_dot() {
  printf "test_connection_string ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_HOSTNAME}./admin"

  echo "${CONNECTION_STATUS_COMMAND}" | "${MONGOSH}" "${CONNECTION_STRING}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string with trailing dot"

  check_failed
}

function test_atlas_in_logs() {
  printf "test_atlas_in_logs ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_HOSTNAME}/admin"
  LOG_ID=$(echo "exit" | "${MONGOSH}" "${CONNECTION_STRING}" | sed -n -e 's/Current Mongosh Log ID:\t//p')
  LOG_PATH="${HOME}/.mongodb/mongosh/${LOG_ID}_log"

  cat "${LOG_PATH}" | grep -Fq '"is_atlas":true' ||
    FAILED="Can't find Atlas mention in the logs"

  check_failed
}

function test_credentials_masking() {
  printf "test_credentials_masking ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_HOSTNAME}/admin"
  MASKED_CREDENTIALS_STRING="mongodb+srv://<credentials>@${ATLAS_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" | "${MONGOSH}" "${CONNECTION_STRING}" |
    grep -Fq "${MASKED_CREDENTIALS_STRING}" ||
    FAILED="When connecting, credentials are not masked in the connection string"

  check_failed
}

function test_cli_args() {
  printf "test_cli_args ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" |
    "${MONGOSH}" "${CONNECTION_STRING}" --username "${ATLAS_USERNAME}" --password "${ATLAS_PASSWORD}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string and username and password arguments"

  check_failed
}

function test_password_prompt() {
  printf "test_password_prompt ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_HOSTNAME}/admin"

  echo -e "${ATLAS_PASSWORD}\n${CONNECTION_STATUS_COMMAND}" |
    "${MONGOSH}" "${CONNECTION_STRING}" --username "${ATLAS_USERNAME}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using password prompt"

  check_failed
}

function test_data_lake() {
  printf "test_data_lake ... "

  CONNECTION_STRING="mongodb://${ATLAS_DATA_LAKE_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" |
    "${MONGOSH}" "${CONNECTION_STRING}" \
      --tls \
      --authenticationDatabase admin \
      --username "${ATLAS_USERNAME}" \
      --password "${ATLAS_PASSWORD}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Data Lake using connection string with username and password"

  check_failed
}

function test_srv_without_nodejs_dns() {
  printf "test_srv_without_nodejs_dns ... "

  CONNECTION_STRING="mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" | NODE_OPTIONS="-r ${MONGOSH_ROOT_DIR}/packages/connectivity-tests/scripts/disable-dns-srv.js" "${MONGOSH}" "${CONNECTION_STRING}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string without Node.js SRV/TXT DNS support"

  check_failed
}

test_connection_string
test_connection_string_fqdn_dot
test_atlas_in_logs
test_credentials_masking
test_cli_args
test_password_prompt
test_data_lake
test_srv_without_nodejs_dns

echo "All Atlas tests are passing"
