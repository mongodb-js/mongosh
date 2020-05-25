$version = "12.4.0"
$url = "https://nodejs.org/download/release/v$version/node-v$version-win-x64.zip"
$filename = "node.zip"
$node_zip = "$PSScriptRoot\$filename"
$node_exe = "$PSScriptRoot\node-v$version-win-x64\node.exe"
$npm = "$PSScriptRoot\node-v$version-win-x64\node_modules\npm2\bin\npm-cli.js"

Write-Host "[NODE] downloading nodejs install"
Write-Host "url : $url"
$start_time = Get-Date
$wc = New-Object System.Net.WebClient
$wc.DownloadFile($url, $node_zip)
Write-Output "$filename downloaded"
Write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"

Expand-Archive $node_zip -DestinationPath $PSScriptRoot
Get-ChildItem -Path $PSScriptRoot

$node_exe $npm i -g npm@latest

Set-Location -Path $PSScriptRoot\..\

