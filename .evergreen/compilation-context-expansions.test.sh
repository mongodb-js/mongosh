BASEDIR=$(dirname $0)

function report {
  printf "[%4s] %30s %s %s\n" $1 $2 $3 $4
}

function fail {
  report FAIL $1 != $2
}

function success {
  report OK $1 == $2
}

# DISTRO_ID=ENABLED
TEST_CASES='
amazon2023.0-arm64-small=false
amazon2023.0-small=false
amazon2-arm64-large=true
amazon2-large=false
debian10-small=false
debian11-small=false
macos-13=true
macos-13-arm64=true
rhel70-build=true
rhel70-large=true
rhel72-zseries-large=false
rhel72-zseries-small=false
rhel7-zseries-large=true
rhel7-zseries-small=true
rhel76-large=false
rhel80-small=false
rhel81-power8-small=false
rhel8-power-small=true
rhel82-arm64-small=false
rhel83-fips=false
rhel83-zseries-small=false
rhel8-zseries-small=false
rhel90-arm64-small=false
rhel90-small=false
rhel93-fips=false
suse12-sp5-large=false
suse15sp4-small=false
ubuntu1804-arm64-large=false
ubuntu1804-large=false
ubuntu2004-arm64-small=false
ubuntu2004-small=false
ubuntu2204-arm64-small=false
ubuntu2204-small=false
windows-64-vs2019-build=true
windows-64-vs2019-small=true
windows-2022-xlarge=true
'

EXIT_VAL=0

for TEST in $TEST_CASES ; do
  DISTRO_ID=$(echo $TEST | cut -d '=' -f 1)
  EXPECTED=$(echo $TEST | cut -d '=' -f 2)

  source "${BASEDIR}/compilation-context-expansions.sh" > /dev/null
  RESULT=$IS_ENABLED

  if [ "$RESULT" != "$EXPECTED" ]; then
    fail $DISTRO_ID $EXPECTED
    EXIT_VAL=1
  else
    success $DISTRO_ID $EXPECTED
  fi
done

exit $EXIT_VAL
