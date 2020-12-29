$ErrorActionPreference = "Stop"

$version = "$Env:NODE_JS_VERSION"
$Env:PATH = "$PSScriptRoot\node-v$version-win-x64;C:\Python39\Scripts;C:\Python39;C:\Program Files\Git\mingw32\libexec\git-core;C:\cmake\bin\;$Env:PATH"

echo "Using node version:"
node --version

echo "Using npm version:"
npm --version

echo "python3 version:"
python -V
