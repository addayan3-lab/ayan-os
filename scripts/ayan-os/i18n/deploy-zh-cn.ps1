# AYAN OS Chinese locale deployment, ASCII-only to support Windows PowerShell 5.1.
$ErrorActionPreference = 'Stop'
$repo = 'C:\AI\ayan-os'
$target = 'ayan-os-openhands-v01'
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$locale = '/opt/agent-canvas/frontend/locales/zh-CN/openhands.json'
$source = Join-Path $repo 'src\i18n\translation.json'
$patch = Join-Path $repo 'scripts\ayan-os\i18n\apply-zh-cn.cjs'
$overridesFile = Join-Path $repo 'scripts\ayan-os\i18n\zh-CN-overrides.json'
$workspace = 'C:\AI\ayan-os-runtime\i18n-validation'
New-Item -Path $workspace -ItemType Directory -Force | Out-Null
if(!(Test-Path $docker) -or !(Test-Path $source) -or !(Test-Path $patch)) {throw 'MISSING_PREREQUISITES'}
if((git -C $repo branch --show-current).Trim() -ne 'ayan-os/base-validation') {throw 'NOT_ON_EXPECTED_BRANCH'}
$image = & $docker inspect $target --format '{{.Config.Image}}'
if($LASTEXITCODE -ne 0 -or $image -ne 'ghcr.io/openhands/agent-canvas:1.33.0') {throw 'UNEXPECTED_CONTAINER_IMAGE'}
$sourceBackup = Join-Path $workspace 'translation-original.json'
$localeBackup = Join-Path $workspace 'openhands.zh-CN-original.json'
$localeEdited = Join-Path $workspace 'openhands.zh-CN-patched.json'
if(!(Test-Path $sourceBackup)) { Copy-Item $source $sourceBackup }
if(!(Test-Path $localeBackup)) {
  & $docker cp ($target + ':' + $locale) $localeBackup
  if($LASTEXITCODE -ne 0) {throw 'BACKUP_CONTAINER_LOCALE_FAILED'}
}
Copy-Item $localeBackup $localeEdited -Force
& node $patch runtime $localeEdited
if($LASTEXITCODE -ne 0) {throw 'PATCH_RUNTIME_FAILED'}
& node $patch source $source
if($LASTEXITCODE -ne 0) {throw 'PATCH_SOURCE_FAILED'}
& $docker cp $localeEdited ($target + ':' + $locale)
if($LASTEXITCODE -ne 0) {throw 'DEPLOY_RUNTIME_LOCALE_FAILED'}
$url = 'http://127.0.0.1:18080/canvas/locales/zh-CN/openhands.json'
$response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 15
$live = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
$translations = Get-Content $overridesFile -Raw -Encoding UTF8 | ConvertFrom-Json
foreach($name in @('COMMAND_MENU$ARIA_LABEL','SIDEBAR$SKILLS','NAV$EXTENSIONS','AUTOMATION_SETUP$TITLE')) {
  if($live.PSObject.Properties[$name].Value -cne $translations.PSObject.Properties[$name].Value) {
    throw ('LIVE_TRANSLATION_CHECK_FAILED_' + $name)
  }
}
$health = Invoke-RestMethod 'http://127.0.0.1:18080/ready' -TimeoutSec 15
if($health.status -ne 'ready') {throw 'AGENT_SERVER_NOT_READY'}
Write-Output 'AYAN_UI_ZH_CN_DEPLOYED'
Write-Output ('ORIGINAL_SOURCE_BACKUP=' + $sourceBackup)
Write-Output ('ORIGINAL_LOCALE_BACKUP=' + $localeBackup)
Write-Output ('LIVE_TRANSLATIONS=' + $url)
