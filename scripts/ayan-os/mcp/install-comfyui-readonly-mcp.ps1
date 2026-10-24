# AYAN OS ComfyUI read-only MCP deployment for existing isolated Docker container.
# Does not change ComfyUI queues, load models, run workflows, or configure secrets.
$ErrorActionPreference = 'Stop'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$src = 'C:\AI\ayan-os\scripts\ayan-os\mcp\comfyui-readonly.mjs'
$container = 'ayan-os-openhands-v01'
if (!(Test-Path $docker) -or !(Test-Path $src)) { throw 'DOCKER_OR_SOURCE_NOT_FOUND' }
node --check $src
if ($LASTEXITCODE -ne 0) { throw 'SOURCE_SYNTAX_INVALID' }
$image = & $docker inspect $container --format '{{.Config.Image}}'
if ($LASTEXITCODE -ne 0 -or $image -ne 'ghcr.io/openhands/agent-canvas:1.33.0') {
  throw 'CONTAINER_IDENTITY_UNEXPECTED'
}
& $docker exec -u 0 $container mkdir -p /opt/ayan-os
if ($LASTEXITCODE -ne 0) { throw 'TARGET_MKDIR_FAILED' }
& $docker cp $src ($container + ':/opt/ayan-os/comfyui-readonly.mjs')
if ($LASTEXITCODE -ne 0) { throw 'FILE_COPY_FAILED' }
& $docker exec -u 0 $container chmod 444 /opt/ayan-os/comfyui-readonly.mjs
if ($LASTEXITCODE -ne 0) { throw 'CHMOD_FAILED' }
& $docker exec $container node --check /opt/ayan-os/comfyui-readonly.mjs
if ($LASTEXITCODE -ne 0) { throw 'CONTAINER_SYNTAX_FAILED' }
Write-Output 'AYAN_COMFYUI_READONLY_MCP_DEPLOYED'
Write-Output 'MCP command: node /opt/ayan-os/comfyui-readonly.mjs'
