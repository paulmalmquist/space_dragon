param([string]$EditorPath)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = Join-Path $repoRoot 'unity/SpaceDragon'
$versionPath = Join-Path $projectPath 'ProjectSettings/ProjectVersion.txt'
if (-not (Test-Path -LiteralPath $versionPath)) {
  throw 'The shared Unity project foundation is not present in this checkout. The portable TownDriveParity.csproj can still test the C# core; integrate the Unity channel foundation before running Editor tests.'
}
$artifactPath = Join-Path $repoRoot 'artifacts/unity-town-drive'
New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
$otherEditor = Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {
  $_.CommandLine -like "*$projectPath*" -or $_.CommandLine -like '*unity/SpaceDragon*'
}
if ($otherEditor) { throw 'The shared Unity Editor is busy. Finish that channel job before testing Town Drive; no process was interrupted.' }
if (-not $EditorPath) {
  $editorVersion = ((Get-Content -LiteralPath $versionPath | Select-Object -First 1) -split ':',2)[1].Trim()
  $editorInfo = (& unity editors path $editorVersion --json | ConvertFrom-Json)
  if (-not $editorInfo.success) { throw "Pinned Unity $editorVersion is not installed." }
  $editorDirectory = $editorInfo.data.path
  if (-not $editorDirectory) { $editorDirectory = $editorInfo.data.installPath }
  if (-not $editorDirectory) { throw 'Unity CLI did not return an Editor path.' }
  $EditorPath = Join-Path $editorDirectory 'Editor/Unity.exe'
}
if (-not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) { throw 'Pinned Unity executable is missing.' }
$runStarted = [DateTime]::UtcNow
$stamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff')
$logPath = Join-Path $artifactPath "editmode-$stamp.log"
$resultPath = Join-Path $artifactPath "editmode-results-$stamp.xml"
$arguments = @('-batchmode','-nographics','-projectPath',$projectPath,'-logFile',$logPath,
  '-runTests','-testPlatform','EditMode','-assemblyNames','SpaceDragon.TownDrive.Tests;SpaceDragon.TownDrive.Unity.Tests',
  '-testResults',$resultPath)
$quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }
$process = Start-Process -FilePath $EditorPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru
$process.WaitForExit(); $process.Refresh()
if ($process.ExitCode -ne 0) { throw "Town Drive Editor tests exited $($process.ExitCode). See $logPath" }
if (-not (Test-Path -LiteralPath $resultPath) -or (Get-Item -LiteralPath $resultPath).LastWriteTimeUtc -lt $runStarted) {
  throw 'Town Drive test result is missing or stale.'
}
[xml]$results = Get-Content -LiteralPath $resultPath
$run = $results.'test-run'
$cases = @($results.SelectNodes('//test-case'))
$coreCases = @($cases | Where-Object { $_.fullname -like 'SpaceDragon.TownDrive.Tests.TownDriveCoreTests.*' })
$adapterCases = @($cases | Where-Object { $_.fullname -like 'SpaceDragon.TownDrive.UnityRuntime.Tests.TownDriveJsonTests.*' })
# Keep the expected inventory explicit: a missing assembly must not look like a pass.
if ($run.result -ne 'Passed' -or [int]$run.total -ne 12 -or [int]$run.passed -ne 12 -or
    [int]$run.failed -ne 0 -or [int]$run.skipped -ne 0 -or [int]$run.inconclusive -ne 0 -or
    $cases.Count -ne 12 -or $coreCases.Count -ne 10 -or $adapterCases.Count -ne 2 -or
    @($cases | Where-Object { $_.result -ne 'Passed' }).Count -ne 0) {
  throw "Town Drive tests did not report all 12 expected cases passing (10 Core, 2 Unity adapter). See $resultPath"
}
Write-Output "Town Drive EditMode tests passed: $($results.'test-run'.total). Results: $resultPath; log: $logPath"
