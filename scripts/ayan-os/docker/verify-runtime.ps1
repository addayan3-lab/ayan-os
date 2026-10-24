# AYAN OS runtime verification. Read-only, no secrets, no LLM calls.
$ErrorActionPreference = 'Stop'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$name = 'ayan-os-openhands-v01'
$root = 'C:\AI\ayan-os-runtime'
$failed = @()
function Check([string]$label, [bool]$good, [string]$value) {
  $status = if($good){'PASS'}else{'FAIL'}
  Write-Output "$status $label $value"
  if(-not $good){$script:failed += $label}
}
if(!(Test-Path $docker)){Write-Output 'FAIL Docker CLI missing';exit 2}
$raw = & $docker inspect $name 2>$null
if($LASTEXITCODE -ne 0){Write-Output 'FAIL AYAN container not found';exit 2}
$c = @($raw | ConvertFrom-Json)[0]
Check 'Running' ([bool]$c.State.Running) ([string]$c.State.Status)
Check 'Image pin' ($c.Config.Image -eq 'ghcr.io/openhands/agent-canvas:1.33.0') ([string]$c.Config.Image)
$port = @($c.NetworkSettings.Ports.'8000/tcp')
$portOk = $port.Count -eq 1 -and $port[0].HostIp -eq '127.0.0.1' -and $port[0].HostPort -eq '18080'
Check 'Loopback-only port' $portOk '127.0.0.1:18080'
$expected = @(
  (Join-Path $root 'projects'),
  (Join-Path $root 'openhands-home')
)
$mounts = @($c.Mounts)
$actual = @($mounts | ForEach-Object { $_.Source.TrimEnd('\') })
$mountsOk = ($actual.Count -eq 2)
foreach($v in $expected){ if($actual -notcontains $v){$mountsOk=$false} }
Check 'Dedicated mounts only' $mountsOk ('count=' + $mounts.Count)
Check 'Not privileged' (-not [bool]$c.HostConfig.Privileged) 'false'
Check 'Memory cap <= 6 GiB' ($c.HostConfig.Memory -gt 0 -and $c.HostConfig.Memory -le 6442450944) ([string]$c.HostConfig.Memory)
Check 'CPU cap <= 4' ($c.HostConfig.NanoCpus -gt 0 -and $c.HostConfig.NanoCpus -le 4000000000) ([string]$c.HostConfig.NanoCpus)
Check 'No new privileges' (@($c.HostConfig.SecurityOpt) -contains 'no-new-privileges:true') 'enforced'
foreach($path in @('/canvas','/health','/alive','/ready','/api/automation/health')) {
  $good = $false
  $detail = 'not ready'
  try {
    $r = Invoke-WebRequest -Uri ('http://127.0.0.1:18080' + $path) -TimeoutSec 12 -UseBasicParsing
    $good = ($r.StatusCode -eq 200)
    if($path -eq '/ready'){$good = $good -and (($r.Content | ConvertFrom-Json).status -eq 'ready')}
    $detail = 'HTTP ' + $r.StatusCode
  } catch {
    $detail = 'HTTP error (no response)'
  }
  Check ('Endpoint ' + $path) $good $detail
}
Write-Output ('AYAN_RUNTIME_' + $(if($failed.Count){'FAILED'}else{'OK'}))
if($failed.Count){exit 1}
exit 0
