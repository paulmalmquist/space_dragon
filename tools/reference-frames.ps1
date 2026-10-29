[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InputFile,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [ValidateRange(0, 86400)][double]$StartSeconds = 0,
    [ValidateRange(0.1, 120)][double]$DurationSeconds = 10,
    [ValidateRange(0.1, 10)][double]$FramesPerSecond = 2,
    [ValidateRange(64, 3840)][int]$Width = 960,
    [string]$FfmpegPath = 'ffmpeg',
    [string]$FfprobePath = 'ffprobe'
)

$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path -LiteralPath $InputFile).Path
if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) { throw 'Input must be a video file.' }
$outputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
if (Test-Path -LiteralPath $outputPath) { throw 'Output directory already exists. Choose a new folder; this helper never overwrites files.' }
$ffmpegCommand = Get-Command $FfmpegPath -CommandType Application -ErrorAction Stop
$ffprobeCommand = Get-Command $FfprobePath -CommandType Application -ErrorAction Stop
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$startText = $StartSeconds.ToString($culture)
$durationText = $DurationSeconds.ToString($culture)
$fpsText = $FramesPerSecond.ToString($culture)
$probeArgs = @('-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,avg_frame_rate:format=duration', '-of', 'json', $inputPath)
$probeOutput = & $ffprobeCommand.Source @probeArgs
if ($LASTEXITCODE -ne 0) { throw 'ffprobe could not read the video. No output directory was created.' }
$probe = ($probeOutput -join [Environment]::NewLine) | ConvertFrom-Json
if (-not $probe.streams -or $probe.streams.Count -eq 0) { throw 'Input has no video stream.' }
New-Item -ItemType Directory -Path $outputPath | Out-Null
$framePattern = Join-Path $outputPath 'frame-%04d.jpg'
$filter = "fps=$fpsText,scale=${Width}:-2:force_original_aspect_ratio=decrease"
$ffmpegArgs = @('-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-ss', $startText, '-i', $inputPath, '-t', $durationText, '-map', '0:v:0', '-vf', $filter, '-q:v', '2', $framePattern)
& $ffmpegCommand.Source @ffmpegArgs
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed. Partial output remains for inspection in $outputPath" }
$frames = @(Get-ChildItem -LiteralPath $outputPath -Filter 'frame-*.jpg' -File)
if ($frames.Count -eq 0) { throw 'No frames were generated. Check the requested time range. Output directory remains for inspection.' }
$receipt = [ordered]@{
    input_filename = [System.IO.Path]::GetFileName($inputPath)
    start_seconds = $StartSeconds
    duration_seconds = $DurationSeconds
    frames_per_second = $FramesPerSecond
    requested_max_width = $Width
    frame_count = $frames.Count
    probe = $probe
    note = 'Frames are visual references, not approved runtime assets. Add what matters about the motion in notes.txt.'
}
$receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outputPath 'capture.json') -Encoding utf8
@'
What to borrow from this clip:
Useful moments / approximate timestamps:
What should look different in Space Dragon:
Source / creator / usage permission:
'@ | Set-Content -LiteralPath (Join-Path $outputPath 'notes.txt') -Encoding utf8
Write-Output "Extracted $($frames.Count) frames to $outputPath"
