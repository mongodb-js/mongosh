$version = "12.4.0"
$Env:PATH = "$PSScriptRoot\node-v$version-win-x64;C:\Program Files\Git\mingw32\libexec\git-core;$Env:PATH"

echo "Using node version:"
node --version

echo "Using npm version:"
npm --version

