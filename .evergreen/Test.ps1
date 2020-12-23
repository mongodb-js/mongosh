$ErrorActionPreference = "Stop"

.\.evergreen\SetupEnv
$Env:EVERGREEN_EXPANSIONS_PATH = $(Join-Path -Path '..' -ChildPath 'tmp/expansions.yaml' -Resolve)

npm run test-ci
