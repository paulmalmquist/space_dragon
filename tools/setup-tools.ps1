# Installs the small local media/texture toolchain, without admin rights or paid apps.
# Project JavaScript packages remain managed separately by package-lock.json / npm ci.
[CmdletBinding()]
param([switch]$SkipFFmpeg, [switch]$SkipKTX)

$ErrorActionPreference = 'Stop'
$taskToolsRoot = Join-Path $env:LOCALAPPDATA 'SpaceDragon'

function Add-UserToolPath {
    param([string]$Directory)
    $taskUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($taskUserPath -split ';' | Where-Object { $_ })
    if (($entries | ForEach-Object { $_.TrimEnd('\') }) -notcontains $Directory.TrimEnd('\')) {
        [Environment]::SetEnvironmentVariable('Path', (($entries + $Directory) -join ';'), 'User')
    }
    if (($env:Path -split ';' | ForEach-Object { $_.TrimEnd('\') }) -notcontains $Directory.TrimEnd('\')) {
        $env:Path += ";$Directory"
    }
}

function Show-ToolVersion {
    param([string]$Executable, [string[]]$VersionArgs)
    # A successful native program may put its version on stderr. In Windows
    # PowerShell 5.1, redirected stderr must not become a terminating error.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $banner = @(& $Executable @VersionArgs 2>&1)
        $nativeExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($nativeExit -ne 0) { throw "Tool version check failed (exit $nativeExit): $Executable" }
    Write-Host ([string]($banner | Select-Object -First 1))
}

if (-not $SkipFFmpeg) {
    $ffmpeg = Get-Command ffmpeg -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $ffmpegPath = if ($ffmpeg) { $ffmpeg.Source } else { $null }
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    if (-not $ffmpegPath -and (Test-Path -LiteralPath $packageRoot)) {
        foreach ($package in (Get-ChildItem -LiteralPath $packageRoot -Directory | Where-Object Name -like 'Gyan.FFmpeg*')) {
            $ffmpegPath = Get-ChildItem -LiteralPath $package.FullName -Filter ffmpeg.exe -File -Recurse | Select-Object -First 1 -ExpandProperty FullName
            if ($ffmpegPath) { break }
        }
    }
    if (-not $ffmpegPath) {
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'winget is required to install FFmpeg. See docs/TOOLCHAIN.md.' }
        & winget install --id Gyan.FFmpeg.Essentials --exact --source winget --scope user --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -ne 0) { throw "FFmpeg installation failed (winget exit $LASTEXITCODE)." }
        foreach ($package in (Get-ChildItem -LiteralPath $packageRoot -Directory | Where-Object Name -like 'Gyan.FFmpeg*')) {
            $ffmpegPath = Get-ChildItem -LiteralPath $package.FullName -Filter ffmpeg.exe -File -Recurse | Select-Object -First 1 -ExpandProperty FullName
            if ($ffmpegPath) { break }
        }
    }
    if (-not $ffmpegPath) { throw 'FFmpeg executable was not found after installation.' }
    Add-UserToolPath (Split-Path -Parent $ffmpegPath)
    Show-ToolVersion -Executable $ffmpegPath -VersionArgs @('-version')
}

if (-not $SkipKTX) {
    $ktxVersion = '4.4.2'
    $ktxRoot = Join-Path $taskToolsRoot "tools\KTX-Software-$ktxVersion"
    $ktxBin = Join-Path $ktxRoot 'bin'
    $toktx = Join-Path $ktxBin 'toktx.exe'
    if (-not (Test-Path -LiteralPath $toktx)) {
        $sevenZip = Get-Command 7z -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        $sevenZipPath = if ($sevenZip) { $sevenZip.Source } else { Join-Path $env:ProgramFiles '7-Zip\7z.exe' }
        if (-not (Test-Path -LiteralPath $sevenZipPath)) {
            throw '7-Zip is needed to extract KTX without elevation. Use an existing 7z installation or the official KTX installer; see docs/TOOLCHAIN.md.'
        }
        $downloadRoot = Join-Path $taskToolsRoot 'downloads'
        New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
        $archive = Join-Path $downloadRoot "KTX-Software-$ktxVersion-Windows-x64.exe"
        $expectedSha256 = '1f323b0fec19794f5e6c0425a61d4b1da396872a10be862d105f4f4b2d2957fe'
        if (-not (Test-Path -LiteralPath $archive)) {
            Invoke-WebRequest -Uri "https://github.com/KhronosGroup/KTX-Software/releases/download/v$ktxVersion/KTX-Software-$ktxVersion-Windows-x64.exe" -OutFile $archive
        }
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedSha256) {
            throw 'KTX archive SHA256 does not match the official release. No payload was run or extracted.'
        }
        New-Item -ItemType Directory -Path $ktxRoot -Force | Out-Null
        # The official NSIS installer requests elevation. Extract the executable/DLL
        # payload and accompanying documentation instead; never run that installer.
        & $sevenZipPath x $archive '-y' "-o$ktxRoot" 'bin\*' 'share\doc\KTX-Software\*' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'KTX payload extraction failed.' }
    }
    Show-ToolVersion -Executable $toktx -VersionArgs @('--version')
    Show-ToolVersion -Executable (Join-Path $ktxBin 'ktx.exe') -VersionArgs @('--version')
    Add-UserToolPath $ktxBin
}

Write-Host 'Tool setup complete. Restart other terminals to pick up user PATH changes.'
& (Join-Path $PSScriptRoot 'setup-doctor.ps1')
