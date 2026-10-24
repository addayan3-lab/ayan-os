# AYAN OS / Docker and Agent Canvas preflight
# Read-only and offline. Returns 2 when runtime dependencies are missing.
$ErrorActionPreference = 'Stop'
$repo = 'C:\AI\ayan-os'
$blocked = @()
function Report([string]$label, [bool]$ok, [string]$detail) {
  Write-Output (($(if($ok){'PASS'}else{'BLOCKED'})) + ' ' + $label + ': ' + $detail)
  if(-not $ok){ $script:blocked += $label }
}

Report 'Source tree' (Test-Path (Join-Path $repo 'package.json')) $repo
if(Test-Path (Join-Path $repo '.git')) {
  $branch = (& git -C $repo branch --show-current).Trim()
  Report 'Validation branch' ($branch -eq 'ayan-os/base-validation') $branch
}else{
  Report 'Git checkout' $false 'Missing repository .git'
}
$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
Report 'WSL binary' ([bool]$wsl) $(if($wsl){'available'}else{'missing'})
$dockerCmd = Get-Command docker.exe -ErrorAction SilentlyContinue
Report 'Docker CLI' ([bool]$dockerCmd) $(if($dockerCmd){$dockerCmd.Source}else{'Docker Desktop not installed'})
if($dockerCmd) {
  $engine = (& docker info --format '{{.OSType}}' 2>$null | Select-Object -First 1)
  Report 'Docker Linux engine' ($LASTEXITCODE -eq 0 -and $engine -eq 'linux') $(if($engine){[string]$engine}else{'Docker Engine unavailable'})
} else {
  Report 'Docker Linux engine' $false 'CLI missing'
}
$port = Get-NetTCPConnection -LocalPort 18080 -State Listen -ErrorAction SilentlyContinue
Report 'Local port 18080' (-not [bool]$port) $(if($port){'already in use'}else{'free'})
Write-Output 'INFO Docker sandbox will bind only to 127.0.0.1:18080'
Write-Output 'INFO No model, payment, GPU or production directory is configured.'
if($blocked.Count -gt 0) {
  Write-Output ('AYAN_DOCKER_PREFLIGHT_BLOCKED=' + ($blocked -join ','))
  exit 2
}
Write-Output 'AYAN_DOCKER_PREFLIGHT_OK'
exit 0
