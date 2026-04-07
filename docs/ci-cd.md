# Drone CI/CD 说明

## 推荐发布策略

- `push` / `pull_request`：只做校验，不做发布
- `promote` 到不同 target：人工确认后按需发布 admin、api 或两者一起发布
- 微信小程序：继续手动上传，CI 只保留代码检查

这样的好处是日常提交足够快，正式环境也不会因为每次 commit 自动变更。

## 仓库内置流程

根目录新增了 [`.drone.yml`](/F:/github-my/edu-nexa/.drone.yml)，当前包含 5 条流水线：

- `admin-ci`：执行管理后台 lint、测试、构建
- `weapp-ci`：执行小程序配置文件和源码语法检查
- `api-ci`：执行 Go 后端测试
- `admin-release`：人工 promote 后发布管理后台静态资源
- `api-release`：人工 promote 后通过服务器固定 compose 文件发布后端

其中 Node 和 Go 相关步骤已经默认切到国内可用源：

- `pnpm` 使用 `https://registry.npmmirror.com`
- `go` 使用 `https://goproxy.cn,direct`

## 发布版本号

admin 和 api 现在共用同一套发布版本号规则：

- 有 Git tag 时，直接使用 tag
- 没有 tag 时，使用 `build-构建号-commit短哈希`

例如：

- `v0.2.0`
- `build-128-a1b2c3d`

管理后台会在界面顶部显示版本号，API 会在健康检查接口里返回版本号。

## 一次性服务器准备

### 1. 准备部署目录

建议在服务器上保留一个干净的仓库副本，例如：

```bash
mkdir -p /app/edu-nexa
cd /app/edu-nexa
git clone <your-repo-url> repo
```

### 2. 准备管理后台发布目录

例如：

```bash
mkdir -p /var/www/edunexa-admin
```

并由 Nginx 指向这个目录。

### 3. 准备后端运行目录

例如：

```bash
mkdir -p /app/edu-nexa/shared/api-config
mkdir -p /app/edu-nexa/shared/api-data
mkdir -p /app/edu-nexa/shared/api-log
```

把生产环境的 `config.yaml` 放到 `api-config` 目录下。

### 4. 准备服务器固定 compose 文件

API 发布脚本会从 Drone secret 读取 compose 路径。按你现在的服务器约定，可以直接配置为：

```text
/app/edu-nexa/api/compose.yml
```

一个示例：

```yaml
version: "3.8"

services:
  app:
    build:
      context: /app/edu-nexa/repo/apps/api
      dockerfile: Dockerfile
      args:
        APP_VERSION: ${APP_VERSION:-dev}
    image: edunexa-api:${APP_VERSION:-dev}
    container_name: edunexa-api
    restart: unless-stopped
    ports:
      - "33001:33001"
    volumes:
      - /app/edu-nexa/shared/api-config:/app/config:ro
      - /app/edu-nexa/shared/api-data:/app/data
      - /app/edu-nexa/shared/api-log:/app/log
    environment:
      - TZ=Asia/Shanghai
```

这份 compose 的关键点有两个：

- `build.args.APP_VERSION` 把发布版本传进 Docker 镜像
- `image: edunexa-api:${APP_VERSION:-dev}` 让每次构建出来的镜像带上明确版本标签

## Drone Secrets

需要在 Drone 仓库里配置这些 secrets：

- `deploy_host`
- `deploy_port`
- `deploy_user`
- `deploy_key`
- `server_repo_dir`
- `admin_web_root`
- `api_compose_file`

一个常见示例：

```text
server_repo_dir=/app/edu-nexa/repo
admin_web_root=/var/www/edunexa-admin
api_compose_file=/app/edu-nexa/api/compose.yml
```

这些目录或路径的职责分别是：

- `server_repo_dir`：服务器上的仓库目录，管理后台和 API 共用这一份代码
- `admin_web_root`：管理后台构建产物的发布目录，通常由 Nginx 直接托管
- `api_compose_file`：服务器上固定维护的 API compose 文件路径

## 发布命令

先让某次通过校验的构建成为候选版本，再人工 promote 到指定目标环境：

```bash
drone build promote <repo> <build_number> admin-production
drone build promote <repo> <build_number> api-production
drone build promote <repo> <build_number> full-production
```

三种 target 的含义分别是：

- `admin-production`：只发布管理后台
- `api-production`：只发布 API
- `full-production`：同时发布管理后台和 API

Drone 官方把 promotion 作为独立事件处理，适合把“校验通过”和“正式发布”分开：[Drone Promotions](https://docs.drone.io/promote/)。

## 小程序建议

微信小程序可以接入 CI 做代码检查，上传发布通常建议保留人工确认。

如果后面你要接自动上传，可以再补一条独立流水线，单独管理体验版上传凭证，不要和正式后端发布绑在一起。
