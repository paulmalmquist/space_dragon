param(
  [ValidateSet('Setup','BuildWeb','BuildWindows','TestScene')][string]$Action = 'Setup',
  [string]$EditorPath,
  [string]$ProjectPath,
  [switch]$ReviewBuild
)
$ErrorActionPreference = 'Stop'
if ($ReviewBuild -and $Action -notin @('BuildWeb','BuildWindows')) {
  throw '-ReviewBuild applies only to BuildWeb or BuildWindows and enables the Development semantic review hooks.'
}
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $ProjectPath) { $ProjectPath = Join-Path $repoRoot 'unity/SpaceDragon' }
$ProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
$versionPath = Join-Path $ProjectPath 'ProjectSettings/ProjectVersion.txt'
if (-not (Test-Path -LiteralPath $versionPath)) {
  throw 'The shared Unity foundation is missing from this checkout. Integrate it before generating Town Drive; this command never bootstraps another channel.'
}
$normalizedProject = $ProjectPath.Replace('\','/').TrimEnd('/')
function Assert-EditorAvailable {
  $busy = Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {
    -not $_.CommandLine -or $_.CommandLine.Replace('\','/').IndexOf($normalizedProject, [StringComparison]::OrdinalIgnoreCase) -ge 0
  }
  if ($busy) { throw 'The selected Unity project is already open or its ownership cannot be verified. Finish that Editor job first; no process was interrupted.' }
}
Assert-EditorAvailable
if (-not $EditorPath) {
  $version = ((Get-Content -LiteralPath $versionPath | Select-Object -First 1) -split ':',2)[1].Trim()
  $info = (& unity editors path $version --json | ConvertFrom-Json)
  if (-not $info.success) { throw "Pinned Unity $version is not installed." }
  $directory = $info.data.path
  if (-not $directory) { $directory = $info.data.installPath }
  if (-not $directory) { throw 'Unity CLI did not return the pinned Editor directory.' }
  $EditorPath = Join-Path $directory 'Editor/Unity.exe'
}
if (-not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) { throw 'Pinned Unity executable is missing.' }
$artifactPath = Join-Path $repoRoot 'artifacts/unity-town-drive-scene'
New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
$temporaryPath = Join-Path $ProjectPath 'Temp'
New-Item -ItemType Directory -Force -Path $temporaryPath | Out-Null
$lockPath = Join-Path $temporaryPath 'town-drive-editor.lock'
$projectLock = $null
$sharedSnapshots = @{}
$changedShared = [Collections.Generic.List[string]]::new()
$process = $null
$runStarted = [DateTime]::UtcNow
$stamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff')
$logPath = Join-Path $artifactPath "$Action-$stamp.log"
$testPath = Join-Path $artifactPath "scene-tests-$stamp.xml"
try {
  try { $projectLock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) }
  catch { throw 'Another guarded Town Drive Editor operation owns this project lock.' }
  Assert-EditorAvailable
  # Detect any shared-setting changes without overwriting another channel's
  # concurrent edits. The C# entry point restores only its own template value.
  foreach ($folder in @('ProjectSettings','Packages')) {
    $root = Join-Path $ProjectPath $folder
    foreach ($file in Get-ChildItem -LiteralPath $root -File -Recurse) {
      $sharedSnapshots[$file.FullName] = [IO.File]::ReadAllBytes($file.FullName)
    }
  }
  $arguments = @('-batchmode','-nographics','-projectPath',$ProjectPath,'-logFile',$logPath)
  if ($Action -eq 'TestScene') {
    $arguments += @('-runTests','-testPlatform','EditMode','-assemblyNames','SpaceDragon.TownDrive.Scene.Tests','-testResults',$testPath)
  } else {
    $arguments += @('-quit','-executeMethod',"SpaceDragon.TownDrive.Editor.TownDriveProject.$Action")
    if ($Action -eq 'BuildWeb') { $arguments += @('-buildTarget','WebGL') }
    if ($Action -eq 'BuildWindows') { $arguments += @('-buildTarget','Win64') }
    if ($ReviewBuild) { $arguments += '-townDriveReviewBuild' }
  }
  $quoted = $arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }
  $process = Start-Process -FilePath $EditorPath -ArgumentList $quoted -WindowStyle Hidden -PassThru
  $process.WaitForExit()
  $process.Refresh()
  if ($process.ExitCode -ne 0) { throw "Town Drive $Action exited $($process.ExitCode). See $logPath" }
  if ($Action -eq 'TestScene') {
    if (-not (Test-Path -LiteralPath $testPath) -or (Get-Item -LiteralPath $testPath).LastWriteTimeUtc -lt $runStarted) { throw 'Town Drive scene test results are missing or stale.' }
    [xml]$results = Get-Content -LiteralPath $testPath
    $cases = @($results.SelectNodes('//test-case'))
    if ($results.'test-run'.result -ne 'Passed' -or $cases.Count -ne 4 -or
        @($cases | Where-Object { $_.result -ne 'Passed' -or $_.fullname -notlike 'SpaceDragon.TownDrive.Editor.Tests.TownDriveSceneTests.*' }).Count -ne 0) {
      throw "All four Town Drive scene acceptance cases must pass. See $testPath"
    }
  } else {
    $receiptRelative = switch ($Action) {
      'Setup' { 'Builds/town-drive-scene-setup-receipt.json' }
      'BuildWeb' { 'Builds/TownDriveWeb/town-drive-build-receipt.json' }
      'BuildWindows' { 'Builds/TownDriveWindows/town-drive-build-receipt.json' }
    }
    $receiptPath = Join-Path $ProjectPath $receiptRelative
    if (-not (Test-Path -LiteralPath $receiptPath) -or (Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc -lt $runStarted) { throw 'Town Drive operation did not produce a fresh receipt.' }
    $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($receipt.result -ne 'Succeeded') { throw "Town Drive receipt is not successful: $receiptPath" }
    if ($Action -in @('BuildWeb','BuildWindows') -and
        ($receipt.developmentBuild -ne [bool]$ReviewBuild -or $receipt.semanticReviewHooks -ne [bool]$ReviewBuild)) {
      throw "Town Drive build receipt does not match the requested review/development mode: $receiptPath"
    }
  }
} finally {
  # Never race a still-running Editor or roll back unowned shared files.
  if (-not $process -or $process.HasExited) {
    foreach ($path in $sharedSnapshots.Keys) {
      $before = $sharedSnapshots[$path]
      $after = if (Test-Path -LiteralPath $path) { [IO.File]::ReadAllBytes($path) } else { [byte[]]@() }
      if ([Convert]::ToBase64String($before) -cne [Convert]::ToBase64String($after)) {
        $changedShared.Add($path.Substring($ProjectPath.Length + 1))
      }
    }
  }
  if ($projectLock) { $projectLock.Dispose() }
  if ($changedShared.Count) {
    $differencePath = Join-Path $artifactPath "shared-setting-differences-$stamp.json"
    @($changedShared) | ConvertTo-Json | Set-Content -LiteralPath $differencePath -Encoding utf8
    Write-Warning "Shared Unity files changed during the job; no changes were overwritten. Review $differencePath"
  }
}
if ($changedShared.Count) { throw 'Shared Unity settings/package changes require review before this operation can be accepted.' }
Write-Output "Town Drive $Action passed. Log: $logPath"
if ($Action -in @('BuildWeb','BuildWindows')) { Write-Output "Development semantic review hooks: $([bool]$ReviewBuild)" }
if ($Action -eq 'TestScene') { Write-Output "Four scene acceptance tests passed: $testPath" }
