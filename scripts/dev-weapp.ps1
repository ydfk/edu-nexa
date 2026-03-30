param(
    [string]$WechatDevtoolsPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$weappRoot = Join-Path $repoRoot "apps\\weapp"
$projectConfigPath = Join-Path $weappRoot "project.config.json"

function Read-ProjectName {
    if (-not (Test-Path $projectConfigPath)) {
        return "edunexa-weapp"
    }

    $config = Get-Content $projectConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ([string]::IsNullOrWhiteSpace($config.projectname)) {
        return "edunexa-weapp"
    }

    return $config.projectname
}

function Find-WechatDevtoolsInfo {
    param(
        [string]$ConfiguredPath
    )

    $searchPaths = @()
    if (-not [string]::IsNullOrWhiteSpace($ConfiguredPath)) {
        $searchPaths += $ConfiguredPath
    }

    $searchPaths += @(
        (Join-Path ${env:LOCALAPPDATA} "Programs\\wechatwebdevtools")
    )

    foreach ($searchPath in $searchPaths) {
        if ([string]::IsNullOrWhiteSpace($searchPath) -or -not (Test-Path $searchPath)) {
            continue
        }

        $cliCandidates = @()
        $appCandidates = @()
        if ((Get-Item $searchPath).PSIsContainer) {
            $cliCandidates = @(
                (Join-Path $searchPath "cli.bat")
            )
            $appCandidates = @(
                (Join-Path $searchPath "WeChatDevtools.exe"),
                (Join-Path $searchPath "wechatwebdevtools.exe")
            )
        } else {
            if ($searchPath.ToLower().EndsWith(".bat")) {
                $cliCandidates = @($searchPath)
            } else {
                $appCandidates = @($searchPath)
            }
        }

        foreach ($candidate in $cliCandidates) {
            if (Test-Path $candidate) {
                return @{
                    cli = $candidate
                    app = ""
                }
            }
        }

        foreach ($candidate in $appCandidates) {
            if (Test-Path $candidate) {
                return @{
                    cli = ""
                    app = $candidate
                }
            }
        }
    }

    return @{
        cli = ""
        app = ""
    }
}

$projectName = Read-ProjectName
$wechatDevtoolsInfo = Find-WechatDevtoolsInfo -ConfiguredPath $WechatDevtoolsPath

if (-not [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.cli)) {
    Start-Process $wechatDevtoolsInfo.cli -ArgumentList @("open", "--project", $weappRoot) | Out-Null
} elseif (-not [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.app)) {
    Start-Process $wechatDevtoolsInfo.app | Out-Null
}

Start-Process explorer.exe $weappRoot | Out-Null

Write-Host ""
Write-Host "EduNexa weapp launcher is ready:" -ForegroundColor Cyan
Write-Host "  Weapp root: $weappRoot"
Write-Host "  Project name: $projectName"
Write-Host ""
Write-Host "Suggested flow:" -ForegroundColor Green
Write-Host "  1. Import the weapp root in WeChat DevTools"
Write-Host "  2. Disable domain check in DevTools when needed"
Write-Host "  3. Start backend services manually when needed"

if (-not [string]::IsNullOrWhiteSpace($WechatDevtoolsPath) -and [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.cli) -and [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.app)) {
    Write-Host ""
    Write-Host "Configured WeChat DevTools path is invalid:" -ForegroundColor DarkYellow
    Write-Host "  $WechatDevtoolsPath"
    Write-Host "Check .vscode/settings.json -> edunexa.wechatDevtoolsPath."
} elseif (-not [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.cli)) {
    Write-Host ""
    Write-Host "WeChat DevTools project opened by CLI:" -ForegroundColor Green
    Write-Host "  $($wechatDevtoolsInfo.cli)"
} elseif (-not [string]::IsNullOrWhiteSpace($wechatDevtoolsInfo.app)) {
    Write-Host ""
    Write-Host "WeChat DevTools opened without project import:" -ForegroundColor Green
    Write-Host "  $($wechatDevtoolsInfo.app)"
} else {
    Write-Host ""
    Write-Host "WeChat DevTools path is not configured. Set .vscode/settings.json -> edunexa.wechatDevtoolsPath." -ForegroundColor DarkYellow
}
