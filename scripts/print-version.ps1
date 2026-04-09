param([string]$Version)

. (Join-Path $PSScriptRoot "release-common.ps1")

$resolvedVersion = Resolve-ReleaseVersion $Version
Write-Output $resolvedVersion
