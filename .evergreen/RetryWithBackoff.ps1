function Retry-With-Backoff([int] $maxAttempt, [timespan] $timeout, [string] $label, [ScriptBlock] $command) {
    $start = Get-Date
    for ($i = 1; $i -le $maxAttempt; $i++) {
        try {
            $currentDuration = New-TimeSpan -Start $start -End (Get-Date)
            Write-Output "[$currentDuration] $label - Try number $i"
            return $command.Invoke()
        } catch [Exception] {
            $secondsToWait = $timeout.TotalSeconds
            $currentDuration = New-TimeSpan -Start $start -End (Get-Date)
            Write-Output "[$currentDuration] $label - Error during try number $i :: $_"

            $isLast = $i -eq $maxAttempt
            if ($isLast) {
                break;
            }

            Write-Output "[$currentDuration] $label - Retrying in $secondsToWait seconds"
            Start-Sleep $secondsToWait
        }
    }
}

# Example Usage:
# Retry-With-Backoff -MaxAttempt 5 -Timeout (New-TimeSpan -Seconds 5) -Label "My Example Script" -Command {
#     Write-Output "Some Random Code"
# }
