$ErrorActionPreference = "Stop"

.\.evergreen\SetupEnv
$Env:EVERGREEN_EXPANSIONS_PATH = $(Join-Path -Path '..' -ChildPath 'tmp/expansions.yaml' -Resolve)

npm run evergreen-release package

$Env:MONGOSH_TEST_EXECUTABLE_PATH = $(Join-Path -Path '.' -ChildPath 'dist/mongosh.exe' -Resolve)
echo "$Env:MONGOSH_TEST_EXECUTABLE_PATH"

npm run test-e2e-ci
