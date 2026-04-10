# 学栖 · EduNexa

EduNexa 是一套面向托管机构的运营产品，当前聚焦两条核心业务链路：

- 晚辅用餐登记
- 作业完成与反馈记录

当前仓库同时包含：

- 管理端：React + Vite + TypeScript
- 后端接口：Go + Fiber + GORM
- 小程序：微信原生小程序骨架

## 仓库结构

```text
apps/
  admin/   React 管理后台
  api/     Go 后端接口
  weapp/   微信小程序
docs/
  foundation-roadmap.md
  product-structure.md
  release-guide.md
  weapp-review-checklist.md
scripts/
  build-api-image.ps1
  push-api-image.ps1
  buildpush-api-image.ps1
  deploy-api.ps1
  pushdeploy-api-image.ps1
  deploy-admin.ps1
  dev-api.ps1
  dev-weapp.ps1
Dockerfile
docker-compose.yml
```

## 当前能力

- 管理端支持账号 + 密码登录
- 小程序支持微信登录态 + 手机号授权链路
- 后端已提供 `auth`、`overview`、`campuses`、`students`、`guardians`、`teachers`、`student-services`、`service-days`、`daily-homework`、`meal-records`、`homework-records` 等接口
- 管理端已覆盖学生台账、每日作业、服务日历、用餐记录、作业记录等业务页面
- 小程序已具备工作台、用餐、作业、我的四个页面及基础状态管理

## 环境要求

推荐本地环境：

- Node.js 22+
- pnpm 10+
- Go 1.24+
- Docker
- Windows PowerShell 5.1+ 或 PowerShell 7+

## 本地开发

### 1. 管理端

安装依赖：

```bash
pnpm install --dir apps/admin
```

启动开发服务：

```bash
pnpm dev:admin
```

常用命令：

```bash
pnpm build:admin
pnpm lint:admin
pnpm test:admin
```

### 2. 后端

直接启动：

```bash
cd apps/api
go run ./cmd
```

Windows 下推荐用热更新脚本：

```bash
pnpm dev:api
```

这条脚本会：

- 自动检查并安装 `air`
- 读取配置中的端口
- 清理残留的 `api-dev.exe`
- 通过 [apps/api/.air.toml](/F:/github-my/edu-nexa/apps/api/.air.toml) 启动热更新

运行测试：

```bash
cd apps/api
go test ./...
```

### 3. 小程序

打开微信开发者工具前，可先执行：

```bash
pnpm dev:weapp
```

这条命令会尽量帮你打开 `apps/weapp` 工程，并读取 `.vscode/settings.json` 中的微信开发者工具路径配置。

需要真机联调时，请在本地修改 [apps/weapp/project.config.json](/F:/github-my/edu-nexa/apps/weapp/project.config.json) 的 `appid`，不要提交该改动。

小程序检查命令：

```bash
pnpm check:weapp
```

## 配置说明

默认后端配置文件在 [apps/api/config/config.yaml](/F:/github-my/edu-nexa/apps/api/config/config.yaml)。

当前数据库支持两种模式：

### SQLite

```yaml
database:
  driver: "sqlite"
  path: "data/edunexa.sqlite"
  dsn: ""
```

### PostgreSQL

```yaml
database:
  driver: "postgres"
  path: ""
  dsn: "host=127.0.0.1 port=5432 user=postgres password=your-password dbname=edu_nexa sslmode=disable TimeZone=Asia/Shanghai"
```

`wechat` 配置仍然保留，原因是：

- `app_id` / `app_secret` 用于微信相关接口能力
- `dev_phone` 用于开发环境下的小程序手机号登录兜底

## 版本机制

当前版本号在前后端都会在构建时写入产物：

- 管理端：打包时通过 Vite 注入到前端代码中
- 后端：编译镜像时通过 Go `ldflags` 写入二进制

版本规则：

1. 优先使用手动传入的 `-Version`
2. 否则如果当前提交刚好命中 Git tag，则使用该 tag
3. 否则使用当前时间戳，例如 `20260410213045`

查看版本：

- 管理端：登录页和页面头部会显示版本号
- 管理端服务器：固定部署目录下会生成 `version.txt`
- 后端接口：访问 `/api/health` 可查看返回中的 `version`

## 发布与部署

当前仓库只保留两条发布链路：

- 后端：单独打包为 Docker 镜像，并可推送到 `hub.ydfk.site`，也可在推送后主动远程更新服务器
- 管理端：在 Windows 本地打包，再上传到远端 Debian 固定目录

### 后端镜像

相关文件：

- [Dockerfile](/F:/github-my/edu-nexa/Dockerfile)
- [docker-compose.yml](/F:/github-my/edu-nexa/docker-compose.yml)

常用命令：

```bash
pnpm version:print
pnpm build:api-image
pnpm push:api-image -- -Version 20260410213045
pnpm buildpush:api-image -- -Version 20260410213045
pnpm deploy:api -- -Version 20260410213045
pnpm pushdeploy:api-image -- -Version 20260410213045
```

说明：

- `build:api-image`：只构建镜像
- `push:api-image`：只推送已经存在的本地镜像
- `buildpush:api-image`：先构建，再推送
- `deploy:api`：通过 SSH 登录远端服务器，执行镜像更新命令
- `pushdeploy:api-image`：先推送镜像，再立即触发远端服务器更新

默认镜像仓库：

```text
hub.ydfk.site/edu-nexa/api
```

默认 Go 代理链：

```text
https://goproxy.cn|https://goproxy.io|https://mirrors.aliyun.com/goproxy/|direct
```

服务端部署示例：

```bash
docker login hub.ydfk.site
APP_VERSION=20260410213045 docker compose pull
APP_VERSION=20260410213045 docker compose up -d
```

如果你希望在 Windows 上推送完成后直接更新服务器：

```powershell
Copy-Item .\scripts\deploy-api.config.example.psd1 .\scripts\deploy-api.local.psd1
pnpm pushdeploy:api-image -- -Version 20260410213045
```

`deploy-api.local.psd1` 示例：

```powershell
@{
  Host = "your.server.ip"
  User = "deploy"
  Port = 22
  SshKeyPath = "C:\\Users\\you\\.ssh\\id_rsa"
  RemoteWorkingDirectory = "/opt/edunexa-api"
  PullCommand = "docker compose pull"
  UpCommand = "docker compose up -d"
  ReloadCommand = ""
}
```

### 管理端部署

相关脚本：

- [scripts/deploy-admin.ps1](/F:/github-my/edu-nexa/scripts/deploy-admin.ps1)
- [scripts/deploy-admin.config.example.psd1](/F:/github-my/edu-nexa/scripts/deploy-admin.config.example.psd1)

首次使用先复制本地配置模板：

```powershell
Copy-Item .\scripts\deploy-admin.config.example.psd1 .\scripts\deploy-admin.local.psd1
```

这个 `deploy-admin.local.psd1` 不会提交到 Git。

示例配置：

```powershell
@{
  Host = "your.server.ip"
  User = "deploy"
  Port = 22
  SshKeyPath = "C:\\Users\\you\\.ssh\\id_rsa"
  RemoteDeployPath = "/var/www/edunexa-admin/dist"
  ReloadCommand = "systemctl reload caddy"
}
```

部署命令：

```powershell
pnpm deploy:admin -- -Version 20260410213045
```

当前管理端部署流程是：

1. 本地执行 `pnpm build:admin`
2. 打包为 `dist/admin-<version>.tar.gz`
3. 上传到远端服务器
4. 清空固定部署目录
5. 解压到固定目录
6. 写入 `version.txt`
7. 可选执行 `ReloadCommand`

## 推荐发布顺序

```powershell
$version = pnpm version:print
pnpm buildpush:api-image -- -Version $version
pnpm deploy:api -- -Version $version
pnpm deploy:admin -- -Version $version
```

更完整的发布说明见 [docs/release-guide.md](/F:/github-my/edu-nexa/docs/release-guide.md)。

## 相关文档

- [docs/product-structure.md](/F:/github-my/edu-nexa/docs/product-structure.md)
- [docs/foundation-roadmap.md](/F:/github-my/edu-nexa/docs/foundation-roadmap.md)
- [docs/weapp-review-checklist.md](/F:/github-my/edu-nexa/docs/weapp-review-checklist.md)
- [docs/release-guide.md](/F:/github-my/edu-nexa/docs/release-guide.md)
