param(
  [string]$Version,
  [string]$ImageRepository = "hub.ydfk.site/edu-nexa/api"
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$resolvedVersion = Resolve-ReleaseVersion $Version

& (Join-Path $PSScriptRoot "build-api-image.ps1") `
  -Version $resolvedVersion `
  -ImageRepository $ImageRepository `
  -SkipSave

if ($LASTEXITCODE -ne 0) {
  throw "API image build step failed"
}

& (Join-Path $PSScriptRoot "push-api-image.ps1") `
  -Version $resolvedVersion `
  -ImageRepository $ImageRepository

if ($LASTEXITCODE -ne 0) {
  throw "API image push step failed"
}
