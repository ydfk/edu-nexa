param(
  [string]$Version,
  [string]$ImageName = "edunexa",
  [string]$OutputDir = "dist",
  [switch]$SkipSave
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Get-GitText {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  try {
    $result = & git @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }

    return ($result | Out-String).Trim()
  } catch {
    return $null
  }
}

function Resolve-Version {
  param([string]$RequestedVersion)

  if ($RequestedVersion -and $RequestedVersion.Trim()) {
    return $RequestedVersion.Trim()
  }

  $exactTag = Get-GitText describe --tags --exact-match
  if ($exactTag) {
    return $exactTag
  }

  return (Get-Date -Format "yyyyMMddHHmmss")
}

$resolvedVersion = Resolve-Version $Version
$resolvedOutputDir = Join-Path $projectRoot $OutputDir
$tarPath = Join-Path $resolvedOutputDir "$ImageName-$resolvedVersion.tar"
$versionFilePath = Join-Path $resolvedOutputDir "version.txt"

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

Write-Host "Starting Docker build..." -ForegroundColor Cyan
Write-Host "Image name: $ImageName" -ForegroundColor DarkCyan
Write-Host "Version: $resolvedVersion" -ForegroundColor DarkCyan

& docker build `
  --build-arg "APP_VERSION=$resolvedVersion" `
  --build-arg "GOPROXY=https://goproxy.cn,direct" `
  --build-arg "GOSUMDB=sum.golang.google.cn" `
  -t "${ImageName}:$resolvedVersion" `
  -t "${ImageName}:latest" `
  .

if ($LASTEXITCODE -ne 0) {
  throw "Docker image build failed"
}

Set-Content -Path $versionFilePath -Value $resolvedVersion -Encoding ascii

if (-not $SkipSave) {
  if (Test-Path $tarPath) {
    Remove-Item -Path $tarPath -Force
  }

  Write-Host "Saving Docker image..." -ForegroundColor Cyan
  & docker save -o $tarPath "${ImageName}:$resolvedVersion"

  if ($LASTEXITCODE -ne 0) {
    throw "Docker image save failed"
  }

  Write-Host "Image archive created: $tarPath" -ForegroundColor Green
}

Write-Host "Version file created: $versionFilePath" -ForegroundColor Green
Write-Host "Image tag: ${ImageName}:$resolvedVersion" -ForegroundColor Green
