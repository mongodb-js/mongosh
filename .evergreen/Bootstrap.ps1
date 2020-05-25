$version = "12.4.0"
$url = "https://nodejs.org/download/release/v$version/node-v$version-win-x64.zip"
$filename = "node.msi"
$node_zip = "$PSScriptRoot\temp\$filename"

New-Item -Path .\temp -Item-Type directory
Write-Host "[NODE] downloading nodejs install"
Write-Host "url : $url"
$start_time = Get-Date
$wc = New-Object System.Net.WebClient
$wc.DownloadFile($url, $node_zip)
Write-Output "$filename downloaded"
Write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s)"

Expand-Archive $node_zip -DestinationPath .\temp
Get-ChildItem -Path .\temp
Set-Location -Path .\temp

.\node.exe .\node_modules\npm2\bin\npm-cli.js i -g npm@latest

Set-Location -Path $PSScriptRoot

npm run bootstrap
