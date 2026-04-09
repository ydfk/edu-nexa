param(
  [string]$Version,
  [string]$ImageRepository = "hub.ydfk.site/edu-nexa/api"
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$resolvedVersion = Resolve-ReleaseVersion $Version

Write-Host "Pushing API image version tag..." -ForegroundColor Cyan
& docker push "${ImageRepository}:$resolvedVersion"
if ($LASTEXITCODE -ne 0) {
  throw "API image version push failed. Build the image first or use buildpush:api-image."
}

Write-Host "Pushing API image latest tag..." -ForegroundColor Cyan
& docker push "${ImageRepository}:latest"
if ($LASTEXITCODE -ne 0) {
  throw "API image latest push failed. Build the image first or use buildpush:api-image."
}

Write-Host "Pushed tags: ${ImageRepository}:$resolvedVersion, ${ImageRepository}:latest" -ForegroundColor Green
