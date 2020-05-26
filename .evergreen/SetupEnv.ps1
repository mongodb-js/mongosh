$version = "12.4.0"
$node_path = "$PSScriptRoot\node-v$version-win-x64\node.exe"
$npm_path = "$PSScriptRoot\node-v$version-win-x64\npm.cmd"
$Env:PATH += ";$node_path;$npm_path"
