param(
  [Alias("Host")]
  [string]$RemoteHost = "",
  [string]$User = "",
  [string]$Version,
  [int]$Port = 0,
  [string]$SshKeyPath = "",
  [string]$RemoteWorkingDirectory = "",
  [string]$PullCommand = "",
  [string]$UpCommand = "",
  [string]$ReloadCommand = "",
  [string]$ConfigPath = ""
)

. (Join-Path $PSScriptRoot "release-common.ps1")

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Resolve-ApiDeployConfigPath {
  param([string]$RequestedPath)

  if ($RequestedPath -and $RequestedPath.Trim()) {
    if ([System.IO.Path]::IsPathRooted($RequestedPath)) {
      return $RequestedPath
    }

    return Join-Path $projectRoot $RequestedPath
  }

  return Join-Path $PSScriptRoot "deploy-api.local.psd1"
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

function Import-ApiDeployConfig {
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

$resolvedConfigPath = Resolve-ApiDeployConfigPath $ConfigPath
$deployConfig = @{}
if (Test-Path $resolvedConfigPath) {
  $deployConfig = Import-ApiDeployConfig -Path $resolvedConfigPath
}

$resolvedHost = Get-ConfigStringValue -ExplicitValue $RemoteHost -Config $deployConfig -Key "Host"
$resolvedUser = Get-ConfigStringValue -ExplicitValue $User -Config $deployConfig -Key "User"
$Port = Get-ConfigIntValue -ExplicitValue $Port -Config $deployConfig -Key "Port" -Fallback 22
$SshKeyPath = Get-ConfigStringValue -ExplicitValue $SshKeyPath -Config $deployConfig -Key "SshKeyPath"
$RemoteWorkingDirectory = Get-ConfigStringValue -ExplicitValue $RemoteWorkingDirectory -Config $deployConfig -Key "RemoteWorkingDirectory" -Fallback "/opt/edunexa-api"
$PullCommand = Get-ConfigStringValue -ExplicitValue $PullCommand -Config $deployConfig -Key "PullCommand" -Fallback "docker compose pull"
$UpCommand = Get-ConfigStringValue -ExplicitValue $UpCommand -Config $deployConfig -Key "UpCommand" -Fallback "docker compose up -d"
$ReloadCommand = Get-ConfigStringValue -ExplicitValue $ReloadCommand -Config $deployConfig -Key "ReloadCommand"

if (-not $resolvedHost) {
  throw "Host is required. Pass -Host or set Host in scripts/deploy-api.local.psd1."
}

if (-not $resolvedUser) {
  throw "User is required. Pass -User or set User in scripts/deploy-api.local.psd1."
}

$resolvedVersion = Resolve-ReleaseVersion $Version
$workingDirectoryLiteral = ConvertTo-ShellLiteral $RemoteWorkingDirectory
$versionLiteral = ConvertTo-ShellLiteral $resolvedVersion

$remoteScript = @'
set -e
working_directory=__WORKING_DIRECTORY__
app_version=__VERSION__
cd "$working_directory"
export APP_VERSION="$app_version"
__PULL_COMMAND__
__UP_COMMAND__
__RELOAD_COMMAND__
'@

$remoteScript = $remoteScript.Replace("__WORKING_DIRECTORY__", $workingDirectoryLiteral)
$remoteScript = $remoteScript.Replace("__VERSION__", $versionLiteral)
$remoteScript = $remoteScript.Replace("__PULL_COMMAND__", $PullCommand)
$remoteScript = $remoteScript.Replace("__UP_COMMAND__", $UpCommand)
$remoteScript = $remoteScript.Replace("__RELOAD_COMMAND__", $ReloadCommand)

$sshArgs = Get-SshArgumentList -Port $Port -SshKeyPath $SshKeyPath
$remoteSshTarget = "{0}@{1}" -f $resolvedUser, $resolvedHost
$sshArgs += @($remoteSshTarget, $remoteScript)

Write-Host "Deploying API image on remote host..." -ForegroundColor Cyan
Write-Host "Version: $resolvedVersion" -ForegroundColor DarkCyan
Write-Host "Remote working directory: $RemoteWorkingDirectory" -ForegroundColor DarkCyan

& ssh @sshArgs
if ($LASTEXITCODE -ne 0) {
  throw "Remote API deploy failed"
}

Write-Host "API deployed version: $resolvedVersion" -ForegroundColor Green
