#!/bin/bash
set -e
# To avoid username and password variables showing up in the logs
set +x

USERNAME="${CONNECTIVITY_TEST_ATLAS_USERNAME}"
PASSWORD="${CONNECTIVITY_TEST_ATLAS_PASSWORD}"
HOSTNAME="${CONNECTIVITY_TEST_ATLAS_HOSTNAME}"
DATA_LAKE_HOSTNAME="${CONNECTIVITY_TEST_DATA_LAKE_HOSTNAME}"

if
  [[ -z "${USERNAME}" ]] ||
    [[ -z "${PASSWORD}" ]] ||
    [[ -z "${HOSTNAME}" ]] ||
    [[ -z "${DATA_LAKE_HOSTNAME}" ]]
then
  echo "Atlas credentials are not provided"
  exit 0
fi

FAILED=no

CONNECTION_STATUS_COMMAND='db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers'
CONNECTION_STATUS_CHECK_STRING="user: '${USERNAME}'"

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

  CONNECTION_STRING="mongodb+srv://${USERNAME}:${PASSWORD}@${HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" | mongosh "${CONNECTION_STRING}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string with username and password"

  check_failed
}

function test_atlas_in_logs() {
  printf "test_atlas_in_logs ... "

  CONNECTION_STRING="mongodb+srv://${USERNAME}:${PASSWORD}@${HOSTNAME}/admin"
  LOG_ID=$(echo "exit" | mongosh "${CONNECTION_STRING}" | sed -n -e 's/Current Mongosh Log ID: //p')
  LOG_PATH="${HOME}/.mongodb/mongosh/${LOG_ID}_log"

  cat "${LOG_PATH}" | grep -Fq '\"is_atlas\":true' ||
    FAILED="Can't find Atlas mention in the logs"

  check_failed
}

function test_credentials_masking() {
  printf "test_credentials_masking ... "

  CONNECTION_STRING="mongodb+srv://${USERNAME}:${PASSWORD}@${HOSTNAME}/admin"
  MASKED_CREDENTIALS_STRING="mongodb+srv://<credentials>@${HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" | mongosh "${CONNECTION_STRING}" |
    grep -Fq "${MASKED_CREDENTIALS_STRING}" ||
    FAILED="When connecting, credentials are not masked in the connection string"

  check_failed
}

function test_cli_args() {
  printf "test_cli_args ... "

  CONNECTION_STRING="mongodb+srv://${HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" |
    mongosh "${CONNECTION_STRING}" --username "${USERNAME}" --password "${PASSWORD}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using connection string and username and password arguments"

  check_failed
}

function test_password_prompt() {
  printf "test_password_prompt ... "

  CONNECTION_STRING="mongodb+srv://${HOSTNAME}/admin"

  echo -e "${PASSWORD}\n${CONNECTION_STATUS_COMMAND}" |
    mongosh "${CONNECTION_STRING}" --username "aaaaaa${USERNAME}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Atlas using password prompt"

  check_failed
}

function test_data_lake() {
  printf "test_data_lake ... "

  CONNECTION_STRING="mongodb://${DATA_LAKE_HOSTNAME}/admin"

  echo "${CONNECTION_STATUS_COMMAND}" |
    mongosh "${CONNECTION_STRING}" \
      --tls \
      --authenticationDatabase admin \
      --username "${USERNAME}" \
      --password "${PASSWORD}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to Data Lake using connection string with username and password"

  check_failed
}

test_connection_string
test_atlas_in_logs
test_credentials_masking
test_cli_args
test_password_prompt
test_data_lake

echo "All Atlas tests are passing"
