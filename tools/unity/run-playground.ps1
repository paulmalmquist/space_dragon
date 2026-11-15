param(
  [ValidateSet('setup','test','windows','web','play')][string]$Action = 'setup',
  [string]$EditorPath
)
# Luke's Playground runner. setup generates the scene, test runs the engine-free EditMode
# tests inside Unity, windows/web build a player and play starts the Windows build.
# It never stops or competes with an Editor that already has this project open.
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = (Resolve-Path (Join-Path $repoRoot 'unity/SpaceDragon')).Path
$artifactPath = Join-Path $repoRoot 'artifacts/unity'
$pinnedVersion = '6000.6.7f1'
$windowsPlayer = Join-Path $projectPath 'Builds/Playground/Windows/LukePlayground.exe'
if ($Action -eq 'play') {
  if (-not (Test-Path -LiteralPath $windowsPlayer -PathType Leaf)) { throw "Build the player first: npm run unity:playground:windows" }
  Start-Process -FilePath $windowsPlayer
  Write-Output "Started $windowsPlayer"
  return
}
$versionLine = Get-Content -LiteralPath (Join-Path $projectPath 'ProjectSettings/ProjectVersion.txt') | Where-Object { $_ -match '^m_EditorVersion:' } | Select-Object -First 1
if (-not $versionLine -or ($versionLine -split ':', 2)[1].Trim() -ne $pinnedVersion) {
  throw "Luke's Playground expects project Editor $pinnedVersion; inspect ProjectVersion.txt before changing the runner."
}
if (-not $EditorPath) {
  $standardPath = Join-Path $env:ProgramFiles "Unity/Hub/Editor/$pinnedVersion/Editor/Unity.exe"
  if (Test-Path -LiteralPath $standardPath -PathType Leaf) { $EditorPath = $standardPath }
  elseif (Get-Command unity -ErrorAction SilentlyContinue) {
    $editorInfo = (& unity editors path $pinnedVersion --json | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or -not $editorInfo.success) { throw "Unity $pinnedVersion is not installed." }
    $editorDirectory = $editorInfo.data.path
    if (-not $editorDirectory) { $editorDirectory = $editorInfo.data.installPath }
    if (-not $editorDirectory) { throw 'The Unity CLI returned no Editor installation path; pass -EditorPath explicitly.' }
    $EditorPath = Join-Path $editorDirectory 'Editor/Unity.exe'
  } else { throw "Cannot locate Unity $pinnedVersion. Pass its Unity.exe path using -EditorPath." }
}
if (-not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) { throw "Missing pinned Editor executable: $EditorPath" }
$EditorPath = (Resolve-Path -LiteralPath $EditorPath).Path

# Do not close or compete with another channel's Editor, including an interactive one.
$normalizedProject = $projectPath.Replace('/', '\')
$runningEditors = @(Get-CimInstance Win32_Process -Filter "Name='Unity.exe'")
foreach ($runningEditor in $runningEditors) {
  if (-not $runningEditor.CommandLine) { throw "Cannot verify the project used by Unity PID $($runningEditor.ProcessId); leave that process untouched and finish it before running the playground." }
  $commandLine = $runningEditor.CommandLine.Replace('/', '\')
  if ($commandLine.IndexOf($normalizedProject, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
      $commandLine.IndexOf('unity\SpaceDragon', [StringComparison]::OrdinalIgnoreCase) -ge 0) {
    throw "SpaceDragon already has an active Unity Editor (PID $($runningEditor.ProcessId)). Use its menu Space Dragon > Luke's Playground > Generate scene instead, or close it first; no process was stopped."
  }
}

New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
Push-Location $repoRoot
try {
  & node tools/prepare-playground-hero.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'The hero model does not match its provenance record. Run: node tools/prepare-playground-hero.mjs' }
  & node --experimental-strip-types tools/unity/export-playground.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Generated playground C# is out of date. Run: npm run unity:playground:export' }
  & node tools/unity/ensure-metas.mjs Playground Traversal --check
  if ($LASTEXITCODE -ne 0) { throw 'A Unity .meta file is missing. Run: node tools/unity/ensure-metas.mjs Playground Traversal' }
  $runStarted = [DateTime]::UtcNow
  $runStamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff') + "-$PID"
  $logPath = Join-Path $artifactPath "playground-$Action-$runStamp.log"
  $resultPath = Join-Path $artifactPath "playground-editmode-$runStamp.xml"
  $arguments = @('-batchmode', '-projectPath', $projectPath, '-logFile', $logPath)
  switch ($Action) {
    'setup' { $arguments += @('-nographics', '-quit', '-executeMethod', 'SpaceDragon.Playground.Editor.LukePlaygroundProject.Setup') }
    'test' { $arguments += @('-nographics', '-runTests', '-testPlatform', 'EditMode', '-assemblyNames', 'SpaceDragon.Traversal.Tests', '-testResults', $resultPath) }
    'windows' { $arguments += @('-quit', '-buildTarget', 'Win64', '-executeMethod', 'SpaceDragon.Playground.Editor.LukePlaygroundProject.BuildWindows') }
    'web' { $arguments += @('-quit', '-buildTarget', 'WebGL', '-executeMethod', 'SpaceDragon.Playground.Editor.LukePlaygroundProject.BuildWeb') }
  }
  $quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
  $editorProcess = Start-Process -FilePath $EditorPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru
  # Wait only for this Editor, not its persistent licensing daemon.
  $editorProcess.WaitForExit()
  $editorProcess.Refresh()
  if ($editorProcess.ExitCode -ne 0) {
    $tail = if (Test-Path -LiteralPath $logPath -PathType Leaf) { (Get-Content -LiteralPath $logPath -Tail 40) -join "`n" } else { '(no log)' }
    throw "Unity playground $Action failed ($($editorProcess.ExitCode)). See $logPath`n$tail"
  }
  if (-not (Test-Path -LiteralPath $logPath -PathType Leaf)) { throw 'The Editor produced no fresh run log.' }
  if ($Action -eq 'test') {
    if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { throw "Missing EditMode result: $resultPath" }
    [xml]$results = Get-Content -LiteralPath $resultPath -Raw
    if ($results.'test-run'.result -ne 'Passed' -or [int]$results.'test-run'.total -lt 1 -or [int]$results.'test-run'.failed -gt 0) {
      throw "Playground tests did not report a nonempty Passed run. See $resultPath and $logPath"
    }
    Write-Output "EditMode results: $resultPath"
  } else {
    $receiptRelative = switch ($Action) { 'setup' { 'Builds/playground-setup-receipt.json' } 'windows' { 'Builds/Playground/Windows/build-receipt.json' } 'web' { 'Builds/Playground/Web/build-receipt.json' } }
    $receiptPath = Join-Path $projectPath $receiptRelative
    if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) { throw "Missing playground receipt: $receiptPath" }
    if ((Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc -lt $runStarted) { throw 'Playground receipt is stale; this run is not verified.' }
    $null = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    Write-Output "Receipt: $receiptPath"
    if ($Action -eq 'windows') { Write-Output "Play it: npm run unity:playground:play" }
  }
  Write-Output "Unity playground $Action completed. Log: $logPath"
} finally { Pop-Location }
