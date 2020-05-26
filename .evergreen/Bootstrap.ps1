$version = "12.4.0"
$url = "https://nodejs.org/download/release/v$version/node-v$version-win-x64.zip"
$filename = "node.zip"
$node_zip = "$PSScriptRoot\$filename"
$node_dir = "$PSScriptRoot\node-v$version-win-x64"

Write-Host "[NODE] downloading nodejs install"
Write-Host "url : $url"
$start_time = Get-Date
$wc = New-Object System.Net.WebClient
$wc.DownloadFile($url, $node_zip)
Write-Output "$filename downloaded"
Write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"

Expand-Archive $node_zip -OutputPath $PSScriptRoot
Get-ChildItem -Path $PSScriptRoot

Set-Location -Path $node_dir
.\node.exe .\node_modules\npm\bin\npm-cli.js i -g npm@latest

Set-Location -Path $PSScriptRoot\..\
npm run boostrap
