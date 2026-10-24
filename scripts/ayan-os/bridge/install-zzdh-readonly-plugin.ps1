param([switch]$VerifyOnly)
$ErrorActionPreference='Stop'
$repo='C:\AI\ayan-os'
$zzName=([string][char]0x5B57)+([char]0x5B57)+([char]0x52A8)+([char]0x753B)+'_9_0_9'
$root=Join-Path (Join-Path (Join-Path $env:USERPROFILE 'Downloads') $zzName) $zzName
$src=Join-Path $repo 'scripts\ayan-os\bridge\plugins\tool_plugins\app\ayan_bridge_handoff'
$dst=Join-Path $root 'user_resources\plugins\tool_plugins\app\ayan_bridge_handoff'
$py=Join-Path $root '_internal\python-3.12\python.exe'
$check=Join-Path $repo 'scripts\ayan-os\bridge\verify-installed-plugin.py'
foreach($path in @($src,$py,$check)){if(!(Test-Path $path)){throw ('MISSING_INPUT: '+$path)}}
$m=Get-Content (Join-Path $src 'plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($m.name -ne 'ayan_bridge_handoff' -or $m.scope -ne 'app' -or !$m.expose_as_tool){throw 'INVALID_OFFICIAL_MANIFEST'}
$names=@('plugin.json','main.py')
if(!(Test-Path $dst)){
 if($VerifyOnly){throw 'NOT_INSTALLED'}
 New-Item -ItemType Directory -Path $dst -ErrorAction Stop|Out-Null
 foreach($name in $names){Copy-Item (Join-Path $src $name) -Destination $dst -ErrorAction Stop}
 'INSTALLED_TO='+$dst
}else{'ALREADY_PRESENT='+$dst}
foreach($name in $names){
 $sourceHash=(Get-FileHash (Join-Path $src $name) -Algorithm SHA256).Hash
 $installedHash=(Get-FileHash (Join-Path $dst $name) -Algorithm SHA256).Hash
 if($sourceHash -ne $installedHash){throw ('EXISTING_PLUGIN_DIFFERS_REFUSE_OVERWRITE: '+$name)}
}
& $py -B $check (Join-Path $dst 'main.py')
if($LASTEXITCODE -ne 0){throw 'OFFICIAL_BUNDLED_PYTHON_TEST_FAILED'}
'AYAN_ZZDH_READONLY_PLUGIN_FILES_AND_SELFTEST_OK'
'HOST_PLUGIN_EXECUTION_REQUIRES_OFFICIAL_UI_VALIDATION'
