param([switch]$OpenBrowser)
$ErrorActionPreference='Stop'
$repo='C:\AI\ayan-os'
$server=Join-Path $repo 'scripts\ayan-os\native\server.mjs'
$root='C:\AI\ayan-os-runtime\windows-native'
$url='http://127.0.0.1:18081/'
function Test-AyanNativeReady {
 try {
  $x=Invoke-RestMethod ($url+'api/health') -TimeoutSec 3
  return ($x.status -eq 'ready' -and $x.mode -eq 'windows-native' -and $x.dockerRequired -eq $false)
 }catch{ return $false }
}
if(!(Test-Path $server)){throw 'NATIVE_SERVER_MISSING'}
if(!(Test-Path $root)){New-Item -ItemType Directory -Force -Path $root|Out-Null}
if(Test-AyanNativeReady){
 'AYAN_NATIVE_ALREADY_READY '+$url
}else{
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $stdout=Join-Path $root 'native.stdout.log'
 $stderr=Join-Path $root 'native.stderr.log'
 $proc=Start-Process -FilePath $node -ArgumentList @('--no-warnings', ('"'+$server+'"')) -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
 'AYAN_NATIVE_START_PID='+$proc.Id
 $ready=$false
 for($i=0;$i -lt 20;$i++){
  Start-Sleep -Milliseconds 500
  if(Test-AyanNativeReady){$ready=$true;break}
  if($proc.HasExited){break}
 }
 if(-not $ready){
  if(Test-Path $stderr){Get-Content $stderr -Tail 20}
  throw 'NATIVE_START_FAILED'
 }
 'AYAN_NATIVE_READY '+$url
}
if($OpenBrowser){Start-Process $url}
