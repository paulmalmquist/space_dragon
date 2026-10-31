param(
  [ValidateSet('setup','test','web','windows')][string]$Action = 'setup',
  [string]$EditorPath = 'C:\Program Files\Unity\Hub\Editor\6000.6.7f1\Editor\Unity.exe'
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = Join-Path $repoRoot 'unity/SpaceDragon'
$artifactPath = Join-Path $repoRoot 'artifacts/unity-launch'
New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
if (-not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) { throw "Missing pinned Editor: $EditorPath" }
$otherEditor = Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object { $_.CommandLine -like "*$projectPath*" -or $_.CommandLine -like '*unity/SpaceDragon*' }
if ($otherEditor) { throw 'The SpaceDragon Editor is already running. Finish that job before starting another.' }
Push-Location $repoRoot
try {
  & node tools/unity/prepare-assets.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Shared asset verification failed.' }
  & node tools/unity/prepare-launch-assets.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Launch asset verification failed.' }
  $runStarted = [DateTime]::UtcNow
  $runStamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff')
  $logPath = Join-Path $artifactPath "$Action-$runStamp.log"
  $resultPath = Join-Path $artifactPath "editmode-results-$runStamp.xml"
  $arguments = @('-batchmode','-nographics','-projectPath',$projectPath,'-logFile',$logPath)
  switch ($Action) {
    'setup' { $arguments += @('-quit','-executeMethod','SpaceDragon.Editor.LaunchLabProject.Setup') }
    'test' { $arguments += @('-runTests','-testPlatform','EditMode','-assemblyNames','SpaceDragon.LaunchLab.Tests;SpaceDragon.FirstContact.Tests','-testResults',$resultPath) }
    'web' { $arguments += @('-quit','-buildTarget','WebGL','-executeMethod','SpaceDragon.Editor.LaunchLabProject.BuildWeb') }
    'windows' { $arguments += @('-quit','-buildTarget','Win64','-executeMethod','SpaceDragon.Editor.LaunchLabProject.BuildWindows') }
  }
  $quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }
  $editorProcess = Start-Process -FilePath $EditorPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru
  $editorProcess.WaitForExit(); $editorProcess.Refresh()
  if ($editorProcess.ExitCode -ne 0) { throw "Unity launch $Action failed ($($editorProcess.ExitCode)). See $logPath" }
  if ($Action -eq 'test') {
    [xml]$results = Get-Content $resultPath
    if ($results.'test-run'.result -ne 'Passed' -or [int]$results.'test-run'.total -lt 1) { throw 'Unity tests did not report a nonempty Passed run.' }
  } else {
    $receiptRelative = switch ($Action) {
      'setup' { 'Builds/launch-setup-receipt.json' }
      'web' { 'Builds/LaunchWeb/build-receipt.json' }
      'windows' { 'Builds/LaunchWindows/build-receipt.json' }
    }
    $receiptPath = Join-Path $projectPath $receiptRelative
    if (-not (Test-Path -LiteralPath $receiptPath)) { throw "Missing launch receipt: $receiptPath" }
    if ((Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc -lt $runStarted) { throw 'Launch receipt is stale.' }
    if ($Action -in @('web','windows')) {
      & node tools/unity/prepare-launch-video.mjs --copy-build $Action
      if ($LASTEXITCODE -ne 0) { throw 'Launch video verification/copy failed.' }
    }
  }
  Write-Output "Unity launch $Action completed. Log: $logPath"
} finally { Pop-Location }
