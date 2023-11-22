#!/bin/bash
set -e
set -x

CONNECTION_STATUS_COMMAND='db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers'
CONNECTION_STATUS_CHECK_STRING="user: 'mongodb.user@EXAMPLE.COM"

MONGOSH=/tmp/mongosh/${TEST_MONGOSH_EXECUTABLE:-packages/mongosh/bin/mongosh.js}

FAILED=no
ANY_FAILED=no

function get_domain_ip() {
  PATTERN="^PING [^ ]+ \(([^)]+)\)"
  OUT="$(ping -c 1 -n $1)"
  [[ $OUT =~ $PATTERN ]]
  echo "${BASH_REMATCH[1]}"
}

function resolve_hosts() {
  MONGODB_1_IP=$(get_domain_ip "mongodb-kerberos-1.example.com")
  MONGODB_2_IP=$(get_domain_ip "mongodb-kerberos-2.example.com")
  MONGODB_3_IP=$(get_domain_ip "mongodb-kerberos-3.examplecrossrealm.com")
  echo "$MONGODB_1_IP mongodb-kerberos-1.example.com" >> /etc/hosts
  echo "$MONGODB_2_IP mongodb-kerberos-2.example.com" >> /etc/hosts
  echo "$MONGODB_3_IP mongodb-kerberos-3.examplecrossrealm.com" >> /etc/hosts
}

function setup_kerberos() {
  printf "Logging in as mongodb.user@EXAMPLE.COM"
  echo 'password' | kinit mongodb.user@EXAMPLE.COM
  klist
}

function update_kerberos_cross_realm() {
  printf "\n[domain_realm]\n  .examplecrossrealm.com = EXAMPLE2.COM\n" >> /etc/krb5.conf
}

function check_failed() {
  if [[ $FAILED != no ]]; then
    printf "FAILED:\n"
    printf "  ${FAILED}\n"
    ANY_FAILED=yes
  else
    printf "OK\n"
  fi
  FAILED=no
}

function test_simple_gssapi_explicit() {
  printf "test_simple_gssapi_explicit ... "

  $MONGOSH --host mongodb-kerberos-1.example.com  --port 27017 --username 'mongodb.user@EXAMPLE.COM' --authenticationMechanism GSSAPI --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-1 using explicit parameters"

  check_failed
}

function test_simple_gssapi_uri() {
  printf "test_simple_gssapi_uri ... "

  CONNECTION_STRING="mongodb://mongodb.user%40EXAMPLE.COM@mongodb-kerberos-1.example.com:27017/?authMechanism=GSSAPI"

  $MONGOSH "${CONNECTION_STRING}" --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-1 using connection string"

  check_failed
}

function test_alternate_gssapi_explicit() {
  printf "test_alternate_gssapi_explicit ... "

  $MONGOSH --host mongodb-kerberos-2.example.com  --port 27017 --username 'mongodb.user@EXAMPLE.COM' --authenticationMechanism GSSAPI --gssapiServiceName alternate --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-2 using explicit parameters"

  check_failed
}

function test_alternate_gssapi_uri() {
  printf "test_alternate_gssapi_uri ... "

  CONNECTION_STRING="mongodb://mongodb.user%40EXAMPLE.COM@mongodb-kerberos-2.example.com:27017/?authMechanism=GSSAPI&authMechanismProperties=SERVICE_NAME:alternate"

  $MONGOSH "${CONNECTION_STRING}" --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-2 using connection string"

  check_failed
}

function test_cross_gssapi_explicit_expect_fail() {
  printf "test_cross_gssapi_explicit_expect_fail ... "

  $MONGOSH --host mongodb-kerberos-3.examplecrossrealm.com  --port 27017 --username 'mongodb.user@EXAMPLE.COM' --authenticationMechanism GSSAPI --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" && FAILED="Can't connect to mongodb-kerberos-3 using explicit parameters"

  check_failed
}

function test_cross_gssapi_explicit() {
  printf "test_cross_gssapi_explicit ... "

  $MONGOSH --host mongodb-kerberos-3.examplecrossrealm.com  --port 27017 --username 'mongodb.user@EXAMPLE.COM' --authenticationMechanism GSSAPI --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-3 using explicit parameters"

  check_failed
}

function test_cross_gssapi_uri() {
  printf "test_cross_gssapi_uri ... "

  CONNECTION_STRING="mongodb://mongodb.user%40EXAMPLE.COM@mongodb-kerberos-3.examplecrossrealm.com:27017/?authMechanism=GSSAPI"

  $MONGOSH "${CONNECTION_STRING}" --quiet --eval "${CONNECTION_STATUS_COMMAND}" |
    grep -Fq "${CONNECTION_STATUS_CHECK_STRING}" ||
    FAILED="Can't connect to mongodb-kerberos-3 using connection string"

  check_failed
}

echo "Waiting for startup..."
sleep 15 # let all services start up
echo "STARTING TESTS..."

resolve_hosts
setup_kerberos

test_simple_gssapi_explicit
test_simple_gssapi_uri

test_alternate_gssapi_explicit
test_alternate_gssapi_uri

test_cross_gssapi_explicit_expect_fail
update_kerberos_cross_realm

test_cross_gssapi_explicit
test_cross_gssapi_uri

if [ $ANY_FAILED = yes ]; then
  exit 1
fi
