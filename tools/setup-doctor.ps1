# Read-only checks. Run from any directory; no accounts, installs, or settings are changed.
[CmdletBinding()]
param([switch]$Json)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Find-Tool {
    param([string]$Name)
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    $candidates = @()
    if ($Name -in @('ktx', 'toktx')) {
        $toolRoot = Join-Path $env:LOCALAPPDATA 'SpaceDragon\tools'
        if (Test-Path -LiteralPath $toolRoot) {
            $candidates += Get-ChildItem -LiteralPath $toolRoot -Filter "$Name.exe" -File -Recurse | Select-Object -ExpandProperty FullName
        }
        $candidates += Join-Path $env:ProgramFiles "KTX-Software\bin\$Name.exe"
    }
    if ($Name -in @('ffmpeg', 'ffprobe')) {
        $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
        if (Test-Path -LiteralPath $packageRoot) {
            foreach ($package in (Get-ChildItem -LiteralPath $packageRoot -Directory | Where-Object Name -like 'Gyan.FFmpeg*')) {
                $candidates += Get-ChildItem -LiteralPath $package.FullName -Filter "$Name.exe" -File -Recurse | Select-Object -ExpandProperty FullName
            }
        }
    }
    if ($Name -eq 'blender') {
        $blenderRoot = Join-Path $env:ProgramFiles 'Blender Foundation'
        if (Test-Path -LiteralPath $blenderRoot) {
            $candidates += Get-ChildItem -LiteralPath $blenderRoot -Filter blender.exe -File -Recurse | Select-Object -ExpandProperty FullName
        }
    }
    return $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Sort-Object -Descending | Select-Object -First 1
}

$checks = @(
    @{ Name = 'Git'; Tool = 'git'; Args = @('--version'); Needed = 'Required' },
    @{ Name = 'Git LFS'; Tool = 'git-lfs'; Args = @('version'); Needed = 'Art sources' },
    @{ Name = 'Node.js'; Tool = 'node'; Args = @('--version'); Needed = 'Required: 24 LTS' },
    @{ Name = 'npm'; Tool = 'npm'; Args = @('--version'); Needed = 'Required' },
    @{ Name = 'Python'; Tool = 'python'; Args = @('--version'); Needed = 'Reference verifier' },
    @{ Name = 'Blender'; Tool = 'blender'; Args = @('--version'); Needed = 'Art authoring' },
    @{ Name = 'FFmpeg'; Tool = 'ffmpeg'; Args = @('-version'); Needed = 'Media preparation' },
    @{ Name = 'FFprobe'; Tool = 'ffprobe'; Args = @('-version'); Needed = 'Media inspection' },
    @{ Name = 'KTX'; Tool = 'ktx'; Args = @('--version'); Needed = 'Texture validation' },
    @{ Name = 'toktx'; Tool = 'toktx'; Args = @('--version'); Needed = 'Texture compression' }
)
$results = foreach ($check in $checks) {
    $executable = Find-Tool $check.Tool
    $status = 'Missing'
    $version = ''
    if ($executable) {
        try {
            $versionArgs = $check.Args
            # Windows PowerShell 5.1 turns redirected native stderr into error
            # records. toktx writes its successful version banner there. Capture
            # both streams and judge the native exit code, not the stream used.
            $previousPreference = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                $output = @(& $executable @versionArgs 2>&1)
                $nativeExit = $LASTEXITCODE
            } finally { $ErrorActionPreference = $previousPreference }
            if ($nativeExit -eq 0) {
                $version = [string]($output | Select-Object -First 1)
                $status = 'Ready'
                if ($check.Tool -eq 'node' -and $version -notmatch '^v24\.') {
                    $status = 'Use Node 24 LTS'
                }
            } else {
                $status = "Failed (exit $nativeExit)"
            }
        } catch { $status = 'Failed to run' }
    }
    [pscustomobject]@{ Tool = $check.Name; Status = $status; Purpose = $check.Needed; Version = $version; Path = $executable }
}

if ($Json) {
    $results | ConvertTo-Json -Depth 3
} else {
    $results | Format-Table Tool, Status, Version -AutoSize
    Write-Host 'Project dependencies:' $(if (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules')) { 'present; npm run check verifies the build' } else { 'run npm ci from the repo root' })
    Write-Host 'Blender MCP connectivity is a separate live check; an installed Blender executable does not prove the add-on is running.'
    Write-Host 'If installed tools are missing from your shell, restart the terminal. This checker also searches known user-local installation folders.'
}
if (@($results | Where-Object { $_.Tool -in @('Git', 'Node.js', 'npm') -and $_.Status -ne 'Ready' }).Count -gt 0) { exit 1 }
