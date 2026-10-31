param(
  [ValidateSet('setup','test','web','windows')][string]$Action = 'setup',
  [string]$EditorPath
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = Join-Path $repoRoot 'unity/SpaceDragon'
$artifactPath = Join-Path $repoRoot 'artifacts/unity'
New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
if (-not $EditorPath) {
  $versionLine = Get-Content (Join-Path $projectPath 'ProjectSettings/ProjectVersion.txt') | Select-Object -First 1
  $editorVersion = ($versionLine -split ':',2)[1].Trim()
  $editorInfo = (& unity editors path $editorVersion --json | ConvertFrom-Json)
  if (-not $editorInfo.success) { throw "Unity $editorVersion is not installed. Install the pinned Editor and Web Build Support first." }
  # CLI JSON field is checked rather than guessing a versioned installation directory.
  $editorDirectory = $editorInfo.data.path
  if (-not $editorDirectory) { $editorDirectory = $editorInfo.data.installPath }
  if (-not $editorDirectory) { throw 'No Editor path in Unity CLI response; pass -EditorPath explicitly.' }
  $EditorPath = Join-Path $editorDirectory 'Editor/Unity.exe'
}
if (-not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) { throw "Missing Editor executable: $EditorPath" }
Push-Location $repoRoot
try {
  & node tools/unity/prepare-assets.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Unity asset preparation failed.' }
  $runStarted = [DateTime]::UtcNow
  $runStamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff')
  $logPath = Join-Path $artifactPath "$Action-$runStamp.log"
  $resultPath = Join-Path $artifactPath "editmode-results-$runStamp.xml"
  $arguments = @('-batchmode','-nographics','-projectPath',$projectPath,'-logFile',$logPath)
  switch ($Action) {
    'setup' { $arguments += @('-quit','-executeMethod','SpaceDragon.Editor.FirstContactProject.Setup') }
    'test' { $arguments += @('-runTests','-testPlatform','EditMode','-assemblyNames','SpaceDragon.FirstContact.Tests','-testResults',$resultPath) }
    'web' { $arguments += @('-quit','-buildTarget','WebGL','-executeMethod','SpaceDragon.Editor.FirstContactProject.BuildWeb') }
    'windows' { $arguments += @('-quit','-buildTarget','Win64','-executeMethod','SpaceDragon.Editor.FirstContactProject.BuildWindows') }
  }
  $quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }
  $editorProcess = Start-Process -FilePath $EditorPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru
  # Wait for the Editor itself; its long-lived licensing daemon is not part of this job.
  $editorProcess.WaitForExit()
  $editorProcess.Refresh()
  if ($editorProcess.ExitCode -ne 0) { throw "Unity $Action failed ($($editorProcess.ExitCode)). See $logPath" }
  if ($Action -eq 'test') {
    [xml]$results = Get-Content $resultPath
    if ($results.'test-run'.result -ne 'Passed') { throw 'Unity tests did not report Passed.' }
  } else {
    $receiptRelative = switch ($Action) {
      'setup' { 'Builds/setup-receipt.json' }
      'web' { 'Builds/Web/build-receipt.json' }
      'windows' { 'Builds/Windows/build-receipt.json' }
    }
    $receiptPath = Join-Path $projectPath $receiptRelative
    if (-not (Test-Path -LiteralPath $receiptPath)) { throw "Unity did not produce the required receipt: $receiptPath" }
    if ((Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc -lt $runStarted) { throw 'Unity receipt is stale; this run is not verified.' }
  }
  Write-Output "Unity $Action completed. Log: $logPath"
} finally { Pop-Location }
