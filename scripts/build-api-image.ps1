param(
  [string]$Version,
  [string]$ImageRepository = "hub.ydfk.site/edu-nexa/api",
  [string]$OutputDir = "dist",
  [switch]$SkipSave
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$resolvedVersion = Resolve-ReleaseVersion $Version
$resolvedOutputDir = Join-Path $projectRoot $OutputDir
$archivePath = Join-Path $resolvedOutputDir ("api-" + $resolvedVersion + ".tar")
$versionFilePath = Join-Path $resolvedOutputDir "version.txt"
$goProxy = "https://goproxy.cn|https://goproxy.io|https://mirrors.aliyun.com/goproxy/|direct"
$goSumDb = "sum.golang.google.cn"

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

Write-Host "Starting API image build..." -ForegroundColor Cyan
Write-Host "Image repository: $ImageRepository" -ForegroundColor DarkCyan
Write-Host "Version: $resolvedVersion" -ForegroundColor DarkCyan

& docker build `
  --build-arg "APP_VERSION=$resolvedVersion" `
  --build-arg "GOPROXY=$goProxy" `
  --build-arg "GOSUMDB=$goSumDb" `
  -t "${ImageRepository}:$resolvedVersion" `
  -t "${ImageRepository}:latest" `
  -f Dockerfile `
  .

if ($LASTEXITCODE -ne 0) {
  throw "API image build failed"
}

Set-Content -Path $versionFilePath -Value $resolvedVersion -Encoding ascii

if (-not $SkipSave) {
  if (Test-Path $archivePath) {
    Remove-Item -Path $archivePath -Force
  }

  Write-Host "Saving API image..." -ForegroundColor Cyan
  & docker save -o $archivePath "${ImageRepository}:$resolvedVersion"

  if ($LASTEXITCODE -ne 0) {
    throw "API image save failed"
  }

  Write-Host "API image archive: $archivePath" -ForegroundColor Green
}

Write-Host "Version file: $versionFilePath" -ForegroundColor Green
Write-Host "Built tags: ${ImageRepository}:$resolvedVersion, ${ImageRepository}:latest" -ForegroundColor Green
