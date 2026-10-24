# AYAN OS / isolated OpenHands Agent Canvas launcher for Windows Docker Desktop
# Intentionally does not run unless -Start is explicitly supplied.
param([switch]$Start)
$ErrorActionPreference = 'Stop'
$dir = 'C:\AI\ayan-os-runtime'
$projects = Join-Path $dir 'projects'
$dataHome = Join-Path $dir 'openhands-home'
$container = 'ayan-os-openhands-v01'
$image = 'ghcr.io/openhands/agent-canvas:1.33.0'
$preflight = Join-Path $PSScriptRoot 'preflight.ps1'

if (-not $Start) {
  Write-Output 'DRY_RUN_ONLY: No Docker image pulled or container started.'
  Write-Output ('Proposed image: ' + $image)
  Write-Output ('Sandbox workspace: ' + $projects)
  Write-Output ('Container data: ' + $dataHome)
  Write-Output 'Browser: http://127.0.0.1:18080/canvas'
  Write-Output 'To launch when prerequisites are met, re-run with -Start.'
  exit 0
}
& $preflight
if ($LASTEXITCODE -ne 0) {
  Write-Output 'START_BLOCKED: Docker prerequisites did not pass.'
  exit 2
}
$existing = (& docker container ls -a --filter "name=^/$container$" --format '{{.Names}}' 2>$null)
if($existing) {
  Write-Output ('START_BLOCKED: Container already exists: ' + $container)
  exit 3
}
New-Item -ItemType Directory -Path $projects,$dataHome -Force | Out-Null
Write-Output ('Pulling official pinned image: ' + $image)
& docker pull $image
if($LASTEXITCODE -ne 0){ Write-Output 'IMAGE_PULL_FAILED'; exit 4 }
# No --privileged, no host Docker socket, no GPU, no production folders.
# All mounts point to purpose-built empty AYAN runtime directories.
$args = @(
  'run','-d','--name',$container,
  '--restart','no',
  '--security-opt','no-new-privileges:true',
  '--pids-limit','512',
  '--memory','6g',
  '--cpus','4',
  '-p','127.0.0.1:18080:8000',
  '--mount',"type=bind,source=$dataHome,target=/home/openhands/.openhands",
  '--mount',"type=bind,source=$projects,target=/projects",
  '-e','AGENT_CANVAS_ALLOW_LAN_SESSION_KEY=true',
  $image
)
& docker @args
if($LASTEXITCODE -ne 0){ Write-Output 'CONTAINER_START_FAILED'; exit 5 }
Write-Output ('CONTAINER_STARTED=' + $container)
Start-Sleep -Seconds 3
& docker ps --filter "name=$container" --format '{{.Names}} | {{.Status}} | {{.Ports}}'
try {
  $r=Invoke-WebRequest -Uri 'http://127.0.0.1:18080/canvas' -UseBasicParsing -TimeoutSec 12 -MaximumRedirection 3
  Write-Output ('CANVAS_HTTP=' + [int]$r.StatusCode)
} catch {
  Write-Output ('CANVAS_CHECK_PENDING_OR_FAILED=' + $_.Exception.Message)
}
Write-Output 'NEXT: Agent Server API health / functional verification is still required.'
