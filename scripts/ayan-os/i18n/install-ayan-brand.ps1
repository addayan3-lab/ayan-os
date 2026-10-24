# AYAN OS approved animated visual identity, static assets only.
$ErrorActionPreference='Stop'
$repo='C:\AI\ayan-os'
$docker='C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$target='ayan-os-openhands-v01'
$assets=Join-Path $repo 'public\ayan-os'
$patcher=Join-Path $repo 'scripts\ayan-os\i18n\patch-ayan-brand-html.cjs'
if((git -C $repo branch --show-current).Trim() -ne 'ayan-os/base-validation'){throw 'WRONG_BRANCH'}
$image=& $docker inspect $target --format '{{.Config.Image}}'
if($LASTEXITCODE -ne 0 -or $image -ne 'ghcr.io/openhands/agent-canvas:1.33.0'){throw 'UNEXPECTED_CONTAINER'}
& node --check (Join-Path $assets 'ayan-brand.js')
if($LASTEXITCODE -ne 0){throw 'JS_CHECK_FAILED'}
& node --check $patcher
if($LASTEXITCODE -ne 0){throw 'PATCHER_CHECK_FAILED'}
& $docker exec -u 0 $target mkdir -p /opt/agent-canvas/frontend/ayan-os
if($LASTEXITCODE -ne 0){throw 'MKDIR_FAILED'}
foreach($file in @('ayan-brand.js','ayan-mark.svg','ayan-icon.png')){
 if(!(Test-Path (Join-Path $assets $file))){throw ('MISSING_ASSET_'+$file)}
 & $docker cp (Join-Path $assets $file) ($target+':/opt/agent-canvas/frontend/ayan-os/'+$file)
 if($LASTEXITCODE -ne 0){throw ('COPY_FAILED_'+$file)}
}
& $docker cp $patcher ($target+':/tmp/ayan-brand-patcher.cjs')
if($LASTEXITCODE -ne 0){throw 'COPY_PATCHER_FAILED'}
& $docker exec -u 0 $target node /tmp/ayan-brand-patcher.cjs
if($LASTEXITCODE -ne 0){throw 'HTML_PATCH_FAILED'}
$root='http://127.0.0.1:18080/canvas/'
$entry=(Invoke-WebRequest $root -UseBasicParsing -TimeoutSec 12).Content
if($entry -notmatch 'ayan-brand.js'){throw 'SCRIPT_REFERENCE_MISSING'}
foreach($item in @('ayan-brand.js','ayan-mark.svg','ayan-icon.png')){
 $response=Invoke-WebRequest ($root+'ayan-os/'+$item) -UseBasicParsing -TimeoutSec 12
 if($response.StatusCode -ne 200){throw ('ASSET_HTTP_FAILED_'+$item)}
}
$health=Invoke-RestMethod 'http://127.0.0.1:18080/ready' -TimeoutSec 12
if($health.status -ne 'ready'){throw 'HEALTH_FAILED'}
'AYAN_BRAND_WEB_DEPLOYED_OK'
