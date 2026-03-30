$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repoRoot "apps\api"
$appConfigPath = Join-Path $apiRoot "config\config.yaml"
$airConfigPath = Join-Path $apiRoot ".air.toml"
$apiBinPath = Join-Path $apiRoot "tmp\api-dev.exe"

function Get-ApiPort {
    if (-not (Test-Path $appConfigPath)) {
        throw "api config not found: $appConfigPath"
    }

    $match = Select-String -Path $appConfigPath -Pattern '^\s*port:\s*"?(?<port>\d+)"?' | Select-Object -First 1
    if (-not $match) {
        throw "failed to read api port from $appConfigPath"
    }

    return $match.Matches[0].Groups["port"].Value
}

function Resolve-AirPath {
    $whereAir = Get-Command air -ErrorAction SilentlyContinue
    if ($whereAir) {
        return $whereAir.Source
    }

    $goPath = (& go env GOPATH 2>$null)
    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($goPath)) {
        $candidates += (Join-Path $goPath "bin\air.exe")
    }
    $candidates += (Join-Path $env:USERPROFILE "go\bin\air.exe")

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    Write-Host "[EduNexa] air not found, installing..."
    & go install github.com/air-verse/air@latest
    if ($LASTEXITCODE -ne 0) {
        throw "failed to install air"
    }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "air installed but executable was not found in GOPATH bin"
}

function Stop-StaleApiProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Port
    )

    $connection = Get-NetTCPConnection -LocalPort ([int]$Port) -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
        return
    }

    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if (-not $process) {
        return
    }

    if ($process.Path -and [System.StringComparer]::OrdinalIgnoreCase.Equals($process.Path, $apiBinPath)) {
        Stop-Process -Id $process.Id -Force
        Write-Host "[EduNexa] stale api-dev.exe on port $Port was stopped"
        return
    }

    throw "port $Port is already in use by $($process.ProcessName) ($($process.Path))"
}

$apiPort = Get-ApiPort
Stop-StaleApiProcess -Port $apiPort

$airPath = Resolve-AirPath
if (-not (Test-Path $airConfigPath)) {
    throw "air config not found: $airConfigPath"
}

Write-Host "[EduNexa] starting api hot reload on port $apiPort..."
Set-Location $apiRoot
& $airPath -c $airConfigPath
exit $LASTEXITCODE
