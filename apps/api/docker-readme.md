# Docker 部署说明

本项目提供了完整的 Docker 部署配置，包括 Dockerfile、.dockerignore 和 docker-compose.yml 文件。

## 构建和运行

### 使用 Docker 构建并运行

```bash
# 构建镜像
docker build -t github.com/ydfk/edu-nexa/apps/api .

# 运行容器
docker run -d -p 33001:33001 --name edunexa-api github.com/ydfk/edu-nexa/apps/api
```

### 使用 Docker Compose 构建并运行（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 配置说明

- 应用默认监听 33001 端口
- 数据存储在 `/app/data` 目录下
- 日志存储在 `/app/log` 目录下
- 配置文件位于 `/app/config` 目录下

## 持久化数据

Docker Compose 默认把运行时目录挂载到宿主机：

- `./data`: 保存应用数据（如 SQLite 数据库）
- `./log`: 保存应用日志
- `./config`: 提供配置文件

如果是正式环境，建议通过环境变量把这些目录切到仓库外，例如：

```bash
export EDUNEXA_CONFIG_DIR=/srv/edu-nexa/shared/api-config
export EDUNEXA_DATA_DIR=/srv/edu-nexa/shared/api-data
export EDUNEXA_LOG_DIR=/srv/edu-nexa/shared/api-log
docker compose up -d --build
```

## 环境变量

您可以通过以下环境变量调整容器运行参数：

- `EDUNEXA_CONTAINER_NAME`
- `EDUNEXA_HOST_PORT`
- `EDUNEXA_CONFIG_DIR`
- `EDUNEXA_DATA_DIR`
- `EDUNEXA_LOG_DIR`

## 自定义配置

如果需要自定义配置，您可以：

1. 修改本地 config 目录下的配置文件，然后重新构建镜像
2. 或者通过环境变量切换到外部配置目录：

```bash
export EDUNEXA_CONFIG_DIR=/srv/edu-nexa/shared/api-config
docker compose up -d --build
```
