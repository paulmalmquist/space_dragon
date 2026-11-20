param(
  [ValidateSet('setup','test','web')][string]$Action = 'setup',
  [string]$EditorPath
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$projectPath = (Resolve-Path (Join-Path $repoRoot 'unity/SpaceDragon')).Path
$artifactPath = Join-Path $repoRoot 'artifacts/unity'
$pinnedVersion = '6000.6.7f1'
$versionLine = Get-Content -LiteralPath (Join-Path $projectPath 'ProjectSettings/ProjectVersion.txt') | Where-Object { $_ -match '^m_EditorVersion:' } | Select-Object -First 1
if (-not $versionLine -or ($versionLine -split ':', 2)[1].Trim() -ne $pinnedVersion) {
  throw "Dogfight requires project Editor $pinnedVersion; inspect ProjectVersion.txt before changing the runner."
}
if (-not $EditorPath) {
  $standardPath = Join-Path $env:ProgramFiles "Unity/Hub/Editor/$pinnedVersion/Editor/Unity.exe"
  if (Test-Path -LiteralPath $standardPath -PathType Leaf) { $EditorPath = $standardPath }
  elseif (Get-Command unity -ErrorAction SilentlyContinue) {
    $editorInfo = (& unity editors path $pinnedVersion --json | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or -not $editorInfo.success) { throw "Unity $pinnedVersion is not installed with the required Web Build Support." }
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
  if (-not $runningEditor.CommandLine) { throw "Cannot verify the project used by Unity PID $($runningEditor.ProcessId); leave that process untouched and finish it before running Dogfight." }
  $commandLine = $runningEditor.CommandLine.Replace('/', '\')
  if ($commandLine.IndexOf($normalizedProject, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
      $commandLine.IndexOf('unity\SpaceDragon', [StringComparison]::OrdinalIgnoreCase) -ge 0) {
    throw "SpaceDragon already has an active Unity Editor (PID $($runningEditor.ProcessId)). Finish that job before starting this one; no process was stopped."
  }
}

New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
Push-Location $repoRoot
try {
  & node tools/unity/prepare-dogfight-assets.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Dogfight asset verification failed. Prepare the selected assets before invoking Unity.' }
  & node tools/unity/prepare-heroic-dragon.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Heroic v005 intake verification failed. Preserve and prepare the new candidate before invoking Unity.' }
  # Match DogfightProject's selection exactly. Preserve the mechanical rollback
  # and fail on an explicitly requested but incomplete organic intake.
  $assetSelection = $env:SPACE_DRAGON_DOGFIGHT_ASSET
  if (-not [string]::IsNullOrEmpty($assetSelection) -and $assetSelection -cne 'heroic-v005' -and $assetSelection -cne 'violet-v007' -and $assetSelection -cne 'oscar-v001') {
    throw 'SPACE_DRAGON_DOGFIGHT_ASSET must be heroic-v005, violet-v007 or oscar-v001.'
  }
  $organicReceipt = Join-Path $projectPath 'Assets/SpaceDragon/Dogfight/asset-receipt-v004.json'
  $verifyOrganic = $assetSelection -ceq 'violet-v007' -or ([string]::IsNullOrEmpty($assetSelection) -and (Test-Path -LiteralPath $organicReceipt -PathType Leaf))
  if ($verifyOrganic) {
    & node tools/unity/prepare-violet-dragon.mjs --verify
    if ($LASTEXITCODE -ne 0) { throw 'Organic v007 intake verification failed. Preserve and prepare the measured candidate before invoking Unity.' }
  }
  $oscarReceipt = Join-Path $projectPath 'Assets/SpaceDragon/Dogfight/asset-receipt-v005.json'
  $verifyOscar = $assetSelection -ceq 'oscar-v001' -or ([string]::IsNullOrEmpty($assetSelection) -and (Test-Path -LiteralPath $oscarReceipt -PathType Leaf))
  if ($verifyOscar) {
    & node tools/unity/prepare-oscar-dragon.mjs --verify
    if ($LASTEXITCODE -ne 0) { throw 'Oscar v001 intake verification failed. Preserve and prepare its measured candidate before invoking Unity.' }
    if ($env:SPACE_DRAGON_DOGFIGHT_MECHANICAL -cne 'none') {
      & node tools/unity/prepare-oscar-mechanical.mjs --verify
      if ($LASTEXITCODE -ne 0) { throw 'Oscar mechanical accessory verification failed. Preserve and prepare the additive candidate.' }
    }
  }
  & node tools/unity/prepare-dogfight-audio-v002.mjs --verify
  if ($LASTEXITCODE -ne 0) { throw 'Dogfight audio v002 intake verification failed. Preserve and prepare the layered cues before invoking Unity.' }
  $runStarted = [DateTime]::UtcNow
  $runStamp = $runStarted.ToString('yyyyMMdd-HHmmss-fff') + "-$PID"
  $logPath = Join-Path $artifactPath "dogfight-$Action-$runStamp.log"
  $resultPath = Join-Path $artifactPath "dogfight-editmode-$runStamp.xml"
  $arguments = @('-batchmode', '-nographics', '-projectPath', $projectPath, '-logFile', $logPath)
  switch ($Action) {
    'setup' { $arguments += @('-quit', '-executeMethod', 'SpaceDragon.Dogfight.Editor.DogfightProject.Setup') }
    'test' { $arguments += @('-runTests', '-testPlatform', 'EditMode', '-assemblyNames', 'SpaceDragon.Dogfight.Tests', '-testResults', $resultPath) }
    'web' { $arguments += @('-quit', '-buildTarget', 'WebGL', '-executeMethod', 'SpaceDragon.Dogfight.Editor.DogfightProject.BuildWeb') }
  }
  $quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
  $editorProcess = Start-Process -FilePath $EditorPath -ArgumentList $quotedArguments -WindowStyle Hidden -PassThru
  # Wait only for this Editor, not its persistent licensing daemon.
  $editorProcess.WaitForExit()
  $editorProcess.Refresh()
  if ($editorProcess.ExitCode -ne 0) { throw "Unity Dogfight $Action failed ($($editorProcess.ExitCode)). See $logPath" }
  if (-not (Test-Path -LiteralPath $logPath -PathType Leaf)) { throw 'The Editor produced no fresh run log.' }
  if ($Action -eq 'test') {
    if (-not (Test-Path -LiteralPath $resultPath -PathType Leaf)) { throw "Missing EditMode result: $resultPath" }
    if ((Get-Item -LiteralPath $resultPath).LastWriteTimeUtc -lt $runStarted) { throw 'EditMode result is stale.' }
    [xml]$results = Get-Content -LiteralPath $resultPath -Raw
    if ($results.'test-run'.result -ne 'Passed' -or [int]$results.'test-run'.total -lt 1 -or [int]$results.'test-run'.failed -gt 0) {
      throw "Dogfight tests did not report a nonempty Passed run. See $resultPath and $logPath"
    }
    Write-Output "EditMode results: $resultPath"
  } else {
    $receiptRelative = if ($Action -eq 'setup') { 'Builds/dogfight-setup-receipt.json' } else { 'Builds/DogfightWeb/build-receipt.json' }
    $receiptPath = Join-Path $projectPath $receiptRelative
    if (-not (Test-Path -LiteralPath $receiptPath -PathType Leaf)) { throw "Missing Dogfight receipt: $receiptPath" }
    if ((Get-Item -LiteralPath $receiptPath).LastWriteTimeUtc -lt $runStarted) { throw 'Dogfight receipt is stale; this run is not verified.' }
    $null = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
    if ($Action -eq 'web' -and -not (Test-Path -LiteralPath (Join-Path $projectPath 'Builds/DogfightWeb/index.html') -PathType Leaf)) {
      throw 'Web build receipt exists but the Dogfight entry page is missing.'
    }
    if ($Action -eq 'web' -and $verifyOscar -and $env:SPACE_DRAGON_DOGFIGHT_MECHANICAL -cne 'none') {
      # Keep the baseline in-game credit and deliver the additive modification
      # notice beside the player. No external service or publication is involved.
      Copy-Item -LiteralPath (Join-Path $repoRoot 'assets/source/dragons/oscar-creativo/mechanical-v004-NOTICE.txt') -Destination (Join-Path $projectPath 'Builds/DogfightWeb/dragon-mechanical-NOTICE.txt') -Force
    }
    if ($Action -eq 'web') {
      Copy-Item -LiteralPath (Join-Path $projectPath 'Assets/SpaceDragon/Dogfight/Imported/PlanetSatellite-v001/planet-satellite-v001-NOTICE.txt') -Destination (Join-Path $projectPath 'Builds/DogfightWeb/planet-satellite-v001-NOTICE.txt') -Force
    }
    Write-Output "Receipt: $receiptPath"
  }
  Write-Output "Unity Dogfight $Action completed. Log: $logPath"
} finally { Pop-Location }
