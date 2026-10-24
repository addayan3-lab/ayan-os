# AYAN OS runtime-only Skills Chinese introduction overlay for Docker.
# Durable source lives in public/ayan-os and src/root.tsx; this applies it
# immediately to the already running upstream image without rebuilding.
$ErrorActionPreference = 'Stop'
$repo = 'C:\AI\ayan-os'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$container = 'ayan-os-openhands-v01'
$asset = Join-Path $repo 'public\ayan-os\skill-intros.zh-CN.js'
$patch = Join-Path $repo 'scripts\ayan-os\docker\patch-skill-html.cjs'
if (!(Test-Path $docker) -or !(Test-Path $asset) -or !(Test-Path $patch)) {
  throw 'MISSING_DOCKER_OR_TRANSLATION_SOURCE'
}
& node --check $asset
if ($LASTEXITCODE -ne 0) {throw 'JS_SYNTAX_ERROR'}
& $docker inspect $container --format '{{.Config.Image}}'
if ($LASTEXITCODE -ne 0) {throw 'CONTAINER_NOT_FOUND'}
& $docker exec -u 0 $container mkdir -p /opt/agent-canvas/frontend/ayan-os
if ($LASTEXITCODE -ne 0) {throw 'CREATE_TARGET_FAILED'}
& $docker cp $asset ($container + ':/opt/agent-canvas/frontend/ayan-os/skill-intros.zh-CN.js')
if ($LASTEXITCODE -ne 0) {throw 'COPY_TRANSLATIONS_FAILED'}
& $docker cp $patch ($container + ':/tmp/ayan-patch-skill-html.cjs')
if ($LASTEXITCODE -ne 0) {throw 'COPY_PATCH_SCRIPT_FAILED'}
& $docker exec -u 0 $container node /tmp/ayan-patch-skill-html.cjs
if ($LASTEXITCODE -ne 0) {throw 'HTML_PATCH_FAILED'}
$u = 'http://127.0.0.1:18080/canvas/ayan-os/skill-intros.zh-CN.js'
$r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 12
if ($r.StatusCode -ne 200 -or $r.Content -notmatch 'add-javadoc') {
  throw 'TRANSLATION_ASSET_HTTP_CHECK_FAILED'
}
$root = (Invoke-WebRequest 'http://127.0.0.1:18080/canvas/' -UseBasicParsing -TimeoutSec 12).Content
if ($root -notmatch 'skill-intros.zh-CN.js') {
  throw 'HTML_SCRIPT_REFERENCE_NOT_FOUND'
}
Write-Output 'AYAN_SKILLS_ZH_DEPLOYED_OK'
Write-Output $u
