param(
  [string]$Version,
  [string]$ImageRepository = "hub.ydfk.site/edu-nexa/api",
  [string]$ApiDeployConfigPath = ""
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$resolvedVersion = Resolve-ReleaseVersion $Version

& (Join-Path $PSScriptRoot "push-api-image.ps1") `
  -Version $resolvedVersion `
  -ImageRepository $ImageRepository

if ($LASTEXITCODE -ne 0) {
  throw "API image push step failed"
}

& (Join-Path $PSScriptRoot "deploy-api.ps1") `
  -Version $resolvedVersion `
  -ConfigPath $ApiDeployConfigPath

if ($LASTEXITCODE -ne 0) {
  throw "Remote API deploy step failed"
}
