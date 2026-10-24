# Apply AYAN Chinese catalog summaries to the already running OpenHands Docker image.
# This is an optional display overlay, no actions/agent settings/credentials changed.
$ErrorActionPreference = 'Stop'
$repo='C:\AI\ayan-os'
$target='ayan-os-openhands-v01'
$docker='C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$base=Join-Path $repo 'public\ayan-os'
$script=Join-Path $repo 'scripts\ayan-os\i18n\patch-catalog-html.cjs'
if((git -C $repo branch --show-current).Trim() -ne 'ayan-os/base-validation'){throw 'UNEXPECTED_BRANCH'}
if(!(Test-Path $script)){throw 'INSTALLER_NOT_FOUND'}
$version = & $docker inspect $target --format '{{.Config.Image}}'
if($LASTEXITCODE -ne 0 -or $version -ne 'ghcr.io/openhands/agent-canvas:1.33.0'){throw 'UNEXPECTED_IMAGE'}
& node --check (Join-Path $base 'catalog-intros.zh-CN.js')
if($LASTEXITCODE -ne 0){throw 'SCRIPT_INVALID'}
& node --check $script
if($LASTEXITCODE -ne 0){throw 'PATCHER_INVALID'}
$catalog = Get-Content (Join-Path $base 'catalog-intros.zh-CN.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if(@($catalog.mcp.PSObject.Properties).Count -ne 79 -or @($catalog.automation.PSObject.Properties).Count -ne 23 -or @($catalog.plugins.PSObject.Properties).Count -ne 9){throw 'JSON_INVALID_OR_INCOMPLETE'}
& $docker exec -u 0 $target mkdir -p /opt/agent-canvas/frontend/ayan-os
if($LASTEXITCODE -ne 0){throw 'MKDIR_FAILED'}
foreach($name in @('catalog-intros.zh-CN.js','catalog-intros.zh-CN.json')){
 & $docker cp (Join-Path $base $name) ($target + ':/opt/agent-canvas/frontend/ayan-os/' + $name)
 if($LASTEXITCODE -ne 0){throw ('COPY_FAILED_'+$name)}
}
& $docker cp $script ($target+':/tmp/ayan-patch-catalog-html.cjs')
if($LASTEXITCODE -ne 0){throw 'COPY_PATCHER_FAILED'}
& $docker exec -u 0 $target node /tmp/ayan-patch-catalog-html.cjs
if($LASTEXITCODE -ne 0){throw 'HTML_PATCH_FAILED'}
$root='http://127.0.0.1:18080/canvas/'
$page=(Invoke-WebRequest $root -UseBasicParsing -TimeoutSec 15).Content
if($page -notmatch 'catalog-intros.zh-CN.js'){throw 'HTML_REFERENCE_MISSING'}
foreach($f in @('catalog-intros.zh-CN.js','catalog-intros.zh-CN.json')){
 $u=$root+'ayan-os/'+$f
 $res=Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 15
 if($res.StatusCode -ne 200){throw ('FILE_NOT_SERVED_'+$f)}
}
$h=Invoke-RestMethod 'http://127.0.0.1:18080/ready' -TimeoutSec 12
if($h.status -ne 'ready'){throw 'BACKEND_UNHEALTHY'}
Write-Output 'AYAN_CATALOG_CHINESE_INTROS_DEPLOYED_OK'
