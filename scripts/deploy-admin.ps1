param(
  [Alias("Host")]
  [string]$RemoteHost = "",
  [string]$User = "",
  [string]$Version,
  [int]$Port = 0,
  [string]$SshKeyPath = "",
  [string]$RemoteDeployPath = "",
  [string]$ReloadCommand = "",
  [string]$ConfigPath = ""
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Resolve-AdminDeployConfigPath {
  param([string]$RequestedPath)

  if ($RequestedPath -and $RequestedPath.Trim()) {
    if ([System.IO.Path]::IsPathRooted($RequestedPath)) {
      return $RequestedPath
    }

    return Join-Path $projectRoot $RequestedPath
  }

  return Join-Path $PSScriptRoot "deploy-admin.local.psd1"
}

function Get-ConfigStringValue {
  param(
    [string]$ExplicitValue,
    [hashtable]$Config,
    [string]$Key,
    [string]$Fallback = ""
  )

  if ($ExplicitValue -and $ExplicitValue.Trim()) {
    return $ExplicitValue.Trim()
  }

  if ($Config.ContainsKey($Key)) {
    $configValue = [string]$Config[$Key]
    if ($configValue.Trim()) {
      return $configValue.Trim()
    }
  }

  return $Fallback
}

function Get-ConfigIntValue {
  param(
    [int]$ExplicitValue,
    [hashtable]$Config,
    [string]$Key,
    [int]$Fallback
  )

  if ($ExplicitValue -gt 0) {
    return $ExplicitValue
  }

  if ($Config.ContainsKey($Key)) {
    $configValue = [int]$Config[$Key]
    if ($configValue -gt 0) {
      return $configValue
    }
  }

  return $Fallback
}

function Import-AdminDeployConfig {
  param([string]$Path)

  $importCommand = Get-Command Import-PowerShellDataFile -ErrorAction SilentlyContinue
  if ($importCommand) {
    return Import-PowerShellDataFile -Path $Path
  }

  $rawContent = Get-Content -Raw -LiteralPath $Path
  $scriptBlock = [scriptblock]::Create($rawContent)
  $loadedConfig = & $scriptBlock
  if ($loadedConfig -isnot [hashtable]) {
    throw "Deploy config file must return a hashtable."
  }

  return $loadedConfig
}

$resolvedConfigPath = Resolve-AdminDeployConfigPath $ConfigPath
$deployConfig = @{}
if (Test-Path $resolvedConfigPath) {
  $deployConfig = Import-AdminDeployConfig -Path $resolvedConfigPath
}

$resolvedHost = Get-ConfigStringValue -ExplicitValue $RemoteHost -Config $deployConfig -Key "Host"
$resolvedUser = Get-ConfigStringValue -ExplicitValue $User -Config $deployConfig -Key "User"
$Port = Get-ConfigIntValue -ExplicitValue $Port -Config $deployConfig -Key "Port" -Fallback 22
$SshKeyPath = Get-ConfigStringValue -ExplicitValue $SshKeyPath -Config $deployConfig -Key "SshKeyPath"
$RemoteDeployPath = Get-ConfigStringValue -ExplicitValue $RemoteDeployPath -Config $deployConfig -Key "RemoteDeployPath" -Fallback "/var/www/edunexa-admin/dist"
$ReloadCommand = Get-ConfigStringValue -ExplicitValue $ReloadCommand -Config $deployConfig -Key "ReloadCommand"

if (-not $resolvedHost) {
  throw "Host is required. Pass -Host or set Host in scripts/deploy-admin.local.psd1."
}

if (-not $resolvedUser) {
  throw "User is required. Pass -User or set User in scripts/deploy-admin.local.psd1."
}

$resolvedVersion = Resolve-ReleaseVersion $Version
$archiveDir = Join-Path $projectRoot "dist"
$archivePath = Join-Path $archiveDir ("admin-" + $resolvedVersion + ".tar.gz")
$versionFilePath = Join-Path $archiveDir "version.txt"
$remoteArchivePath = "/tmp/admin-$resolvedVersion.tar.gz"

New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

Write-Host "Building admin bundle..." -ForegroundColor Cyan
$previousAppVersion = $env:APP_VERSION
$env:APP_VERSION = $resolvedVersion

try {
  & pnpm build:admin
  if ($LASTEXITCODE -ne 0) {
    throw "Admin build failed"
  }
} finally {
  if ($null -eq $previousAppVersion) {
    Remove-Item Env:APP_VERSION -ErrorAction SilentlyContinue
  } else {
    $env:APP_VERSION = $previousAppVersion
  }
}

if (Test-Path $archivePath) {
  Remove-Item -Path $archivePath -Force
}

Write-Host "Packaging admin bundle..." -ForegroundColor Cyan
& tar -C apps/admin/dist -czf $archivePath .
if ($LASTEXITCODE -ne 0) {
  throw "Admin archive creation failed"
}

Set-Content -Path $versionFilePath -Value $resolvedVersion -Encoding ascii

$scpArgs = Get-ScpArgumentList -Port $Port -SshKeyPath $SshKeyPath
$remoteScpTarget = "{0}@{1}:{2}" -f $resolvedUser, $resolvedHost, $remoteArchivePath
$scpArgs += @($archivePath, $remoteScpTarget)

Write-Host "Uploading admin archive..." -ForegroundColor Cyan
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
  throw "Admin archive upload failed"
}

$reloadStatement = ""
if ($ReloadCommand -and $ReloadCommand.Trim()) {
  $reloadStatement = $ReloadCommand.Trim()
}

$archivePathLiteral = ConvertTo-ShellLiteral $remoteArchivePath
$deployPathLiteral = ConvertTo-ShellLiteral $RemoteDeployPath
$deployParentLiteral = ConvertTo-ShellLiteral ((Split-Path -Path $RemoteDeployPath -Parent) -replace "\\", "/")
$versionLiteral = ConvertTo-ShellLiteral $resolvedVersion

$remoteScript = @'
set -e
archive_path=__ARCHIVE_PATH__
deploy_path=__DEPLOY_PATH__
deploy_parent=__DEPLOY_PARENT__
mkdir -p "$deploy_parent" "$deploy_path"
find "$deploy_path" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$archive_path" -C "$deploy_path"
printf '%s\n' __VERSION__ > "$deploy_path/version.txt"
rm -f "$archive_path"
__RELOAD_COMMAND__
'@

$remoteScript = $remoteScript.Replace("__ARCHIVE_PATH__", $archivePathLiteral)
$remoteScript = $remoteScript.Replace("__DEPLOY_PATH__", $deployPathLiteral)
$remoteScript = $remoteScript.Replace("__DEPLOY_PARENT__", $deployParentLiteral)
$remoteScript = $remoteScript.Replace("__VERSION__", $versionLiteral)
$remoteScript = $remoteScript.Replace("__RELOAD_COMMAND__", $reloadStatement)

$sshArgs = Get-SshArgumentList -Port $Port -SshKeyPath $SshKeyPath
$remoteSshTarget = "{0}@{1}" -f $resolvedUser, $resolvedHost
$sshArgs += @($remoteSshTarget, $remoteScript)

Write-Host "Deploying admin bundle on remote host..." -ForegroundColor Cyan
& ssh @sshArgs
if ($LASTEXITCODE -ne 0) {
  throw "Remote admin deploy failed"
}

Write-Host "Admin deployed version: $resolvedVersion" -ForegroundColor Green
Write-Host "Remote deploy path: $RemoteDeployPath" -ForegroundColor Green
