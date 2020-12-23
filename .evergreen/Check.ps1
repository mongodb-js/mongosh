$ErrorActionPreference = "Stop"

.\.evergreen\SetupEnv

npm run check-ci
