param()
$ErrorActionPreference='Stop'
$repo='C:\AI\ayan-os'
$icon=Join-Path $repo 'public\ayan-os\ayan-os.ico'
$start=Join-Path $repo 'scripts\ayan-os\native\start-native.ps1'
$backup='C:\AI\ayan-os-runtime\windows-native\backup-shortcuts'
$desktop=[Environment]::GetFolderPath('DesktopDirectory')
$name=[string]([char]0x963F)+[string]([char]0x5CA9)+' OS'
$path=Join-Path $desktop ($name+'.lnk')
if(!(Test-Path $icon) -or !(Test-Path $start)){throw 'NATIVE_START_OR_ICON_MISSING'}
if((Invoke-RestMethod 'http://127.0.0.1:18081/api/health' -TimeoutSec 8).mode -ne 'windows-native'){throw 'NATIVE_ENDPOINT_NOT_READY'}
New-Item -ItemType Directory -Force -Path $backup | Out-Null
$shell=New-Object -ComObject WScript.Shell
if(Test-Path $path){
 $original=$shell.CreateShortcut($path)
 $originalCommand=$original.TargetPath+' '+$original.Arguments
 if($originalCommand -notmatch '18080|18081|start-native\.ps1|ayan-os-openhands-v01'){
  throw 'DESKTOP_LINK_UNRELATED_REFUSED'
 }
 $snapshot=Join-Path $backup ('ayan-os-before-native-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.lnk')
 Copy-Item -LiteralPath $path -Destination $snapshot
 'OLD_LINK_BACKUP='+$snapshot
}else{
 'DESKTOP_LINK_NOT_PRESENT_CREATE'
}
$link=$shell.CreateShortcut($path)
$link.TargetPath=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$link.Arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$start+'" -OpenBrowser'
$link.WorkingDirectory=$repo
$link.IconLocation=$icon+',0'
$link.Description='阿岩 OS V0.2.0 - Windows 原生控制中心'
$link.Save()
$check=$shell.CreateShortcut($path)
if($check.Arguments -notmatch 'start-native\.ps1' -or $check.Arguments -match 'docker'){throw 'SHORTCUT_SWITCH_FAILED'}
'AYAN_DESKTOP_NOW_NATIVE='+$path
'ARGUMENTS='+$check.Arguments
