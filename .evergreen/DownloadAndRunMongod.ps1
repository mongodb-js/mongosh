$platform = "win32"
$version = "mongodb-win32-x86_64-2012plus-4.2.8"
$port = "27018"

$platformPath = "$PSScriptRoot\mongodb\$platform"
$versionPath = "$platformPath\$version"
$binaryPath = "$versionPath\bin\mongod.exe"
$dataPath = "$versionPath\data\db"
$logDir = "$versionPath\logs"

if (!(Test-Path $binaryPath)) {
  $url = "https://fastdl.mongodb.org/$platform/$version.zip";
  $output = "$PSScriptRoot\mongodb.zip"
  Write-Output "Downloading $url"

  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  (New-Object System.Net.WebClient).DownloadFile($url, $output)

  Write-Output "Downloaded $url"

  Microsoft.PowerShell.Archive\Expand-Archive $output -DestinationPath $platformPath
} else {
  Write-Output "$binaryPath already exists, skipping download"
}

if (!(Test-Path $dataPath)) {
  mkdir $dataPath
} else {
  Write-Output "$dataPath already exists, skipping mkdir"
}

if (!(Test-Path $logDir)) {
  mkdir $logDir
} else {
  Write-Output "$logDir already exists, skipping mkdir"
}

Start-Job -ScriptBlock {
  & $using:binaryPath --dbpath $using:dataPath --bind_ip_all --port $using:port --logpath $using:logDir\mongod.log
}

$timeout = New-TimeSpan -Seconds 10
$endTime = (Get-Date).Add($timeout)

do {
  Write-Host "waiting for mongo..."
  Start-Sleep 3
} until(((Get-Date) -gt $endTime) -or (Test-NetConnection "localhost" -Port "$port" | Where-Object { $_.TcpTestSucceeded }))

if (Test-NetConnection "localhost" -Port "$port" | Where-Object { $_.TcpTestSucceeded }) {
  Write-Host "mongod ready on port $port"
} else {
  throw "Failed to start mongo"
}
