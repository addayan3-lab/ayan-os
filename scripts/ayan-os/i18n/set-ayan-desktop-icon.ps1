# Update an existing desktop shortcut for AYAN OS; create one only if no matching shortcut exists.
# Backup originals; never rewrite unrelated shortcuts or credentials.
$ErrorActionPreference='Stop'
$repo='C:\AI\ayan-os'
$icon=Join-Path $repo 'public\ayan-os\ayan-os.ico'
$site='http://127.0.0.1:18080/canvas/'
if(!(Test-Path $icon)){throw 'AYAN_ICO_NOT_FOUND'}
$name=[string]([char]0x963F)+[string]([char]0x5CA9)+' OS'
$paths=@([Environment]::GetFolderPath('DesktopDirectory'),"$env:USERPROFILE\Desktop","$env:USERPROFILE\OneDrive\Desktop","$env:PUBLIC\Desktop")|Where-Object{$_ -and (Test-Path $_)}|Select-Object -Unique
$w=New-Object -ComObject WScript.Shell
$hits=@()
foreach($folder in $paths){
 foreach($item in Get-ChildItem -LiteralPath $folder -File -ErrorAction SilentlyContinue | Where-Object {$_.Extension -in @('.lnk','.url')}){
  $match=($item.BaseName -match 'ayan|openhands|agent.canvas') -or $item.BaseName.Contains($name.Substring(0,2))
  if($item.Extension -eq '.lnk'){
   $shortcut=$w.CreateShortcut($item.FullName)
   $match=$match -or (($shortcut.TargetPath+' '+$shortcut.Arguments) -match '127.0.0.1:18080|localhost:18080')
  }else{
   $txt=Get-Content -LiteralPath $item.FullName -Raw -ErrorAction SilentlyContinue
   $match=$match -or ($txt -match '127.0.0.1:18080|localhost:18080')
  }
  if($match){$hits+=,$item}
 }
}
$backup='C:\AI\ayan-os-runtime\branding-shortcut-backup'
New-Item -ItemType Directory -Force -Path $backup|Out-Null
if($hits.Count -gt 0){
 foreach($item in $hits){
  $dest=Join-Path $backup $item.Name
  if(!(Test-Path $dest)){Copy-Item -LiteralPath $item.FullName -Destination $dest}
  if($item.Extension -eq '.lnk'){
    $link=$w.CreateShortcut($item.FullName)
    $link.IconLocation=$icon+',0'
    $link.Description='AYAN OS - '+$site
    $link.Save()
    if($item.BaseName -ne $name -and -not (Test-Path (Join-Path $item.DirectoryName ($name+'.lnk')))){
      Rename-Item -LiteralPath $item.FullName -NewName ($name+'.lnk')
    }
  }else{
    # Internet shortcut format supports [InternetShortcut] IconFile and IconIndex.
    $file=$item.FullName
    $lines=[System.Collections.Generic.List[string]]::new()
    foreach($line in Get-Content -LiteralPath $file -Encoding Default){
      if($line -notmatch '^(IconFile|IconIndex)='){$lines.Add($line)}
    }
    if($lines.Count -lt 1){$lines.Add('[InternetShortcut]');$lines.Add('URL='+$site)}
    $lines.Add('IconFile='+$icon);$lines.Add('IconIndex=0')
    [System.IO.File]::WriteAllLines($file,$lines,[System.Text.Encoding]::Default)
    if($item.BaseName -ne $name -and -not (Test-Path (Join-Path $item.DirectoryName ($name+'.url')))){
      Rename-Item -LiteralPath $item.FullName -NewName ($name+'.url')
    }
  }
  Write-Output ('SHORTCUT_UPDATED='+(Join-Path $item.DirectoryName ($name+$item.Extension)))
 }
} else {
  $desktop=[Environment]::GetFolderPath('DesktopDirectory')
  if(!(Test-Path $desktop)){throw 'DESKTOP_NOT_FOUND'}
  $target=@(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )|Where-Object{Test-Path $_}|Select-Object -First 1
  if(-not $target){throw 'NO_BROWSER_BINARY_FOUND'}
  $path=Join-Path $desktop ($name+'.lnk')
  $link=$w.CreateShortcut($path)
  $link.TargetPath=$target
  $link.Arguments='--app='+$site
  $link.WorkingDirectory=$repo
  $link.IconLocation=$icon+',0'
  $link.Description='AYAN OS'
  $link.Save()
  Write-Output ('SHORTCUT_CREATED='+$path)
}
'SHORTCUT_BRAND_ICON='+$icon
