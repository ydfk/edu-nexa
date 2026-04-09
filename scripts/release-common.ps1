$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

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

function Resolve-ReleaseVersion {
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

function Get-SshArgumentList {
  param(
    [int]$Port = 22,
    [string]$SshKeyPath
  )

  $args = @("-o", "StrictHostKeyChecking=accept-new", "-p", "$Port")
  if ($SshKeyPath -and $SshKeyPath.Trim()) {
    $args += @("-i", $SshKeyPath.Trim())
  }

  return $args
}

function Get-ScpArgumentList {
  param(
    [int]$Port = 22,
    [string]$SshKeyPath
  )

  $args = @("-o", "StrictHostKeyChecking=accept-new", "-P", "$Port")
  if ($SshKeyPath -and $SshKeyPath.Trim()) {
    $args += @("-i", $SshKeyPath.Trim())
  }

  return $args
}

function ConvertTo-ShellLiteral {
  param([string]$Value)

  if ($null -eq $Value) {
    return "''"
  }

  return "'" + $Value.Replace("'", "'""'""'") + "'"
}
