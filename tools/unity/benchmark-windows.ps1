param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$playerPath = Join-Path $repoRoot 'unity/SpaceDragon/Builds/Windows/SpaceDragon.exe'
if (-not (Test-Path -LiteralPath $playerPath -PathType Leaf)) { throw 'Build the Windows candidate first with tools/unity/run.ps1 windows.' }
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repoRoot ('artifacts/unity/native-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fff')) }
if (Test-Path -LiteralPath $OutputDirectory) { throw 'Choose a new output directory; prior benchmark evidence is preserved.' }
$destination = New-Item -ItemType Directory -Path $OutputDirectory
$outputPath = $destination.FullName
$logPath = Join-Path $outputPath 'player.log'
# Open the actual interactive game window for visible rendering review. This
# candidate's reflection capture does not complete in a headless batch player.
# The explicit benchmark suppresses saves and exits after the bounded sample.
$arguments = @('-screen-fullscreen','0','-screen-width','1280','-screen-height','720',
  '-logFile',$logPath,'--space-dragon-benchmark',$outputPath)
$quotedArguments = $arguments | ForEach-Object { '"' + $_.Replace('"','\"') + '"' }
$playerProcess = Start-Process -FilePath $playerPath -ArgumentList $quotedArguments -WindowStyle Normal -PassThru
$playerProcess.WaitForExit()
$playerProcess.Refresh()
if ($playerProcess.ExitCode -ne 0) { throw "Native benchmark failed ($($playerProcess.ExitCode)). See $logPath" }
$reportPath = Join-Path $outputPath 'native-arrival-measurements.json'
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($report.result -notlike 'PASS:*') { throw "Native benchmark did not pass. See $reportPath" }
Write-Output "Native benchmark completed: $reportPath"
