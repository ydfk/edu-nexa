# EduNexa

EduNexa 是一套面向托管机构的运营系统，当前围绕两条核心业务链路展开：

- 用餐登记与反馈
- 每日作业下发、完成记录与回看

仓库目前同时维护 3 个应用：

- `apps/admin`：React + Vite + TypeScript 管理端
- `apps/api`：Go + Fiber + GORM 后端接口
- `apps/weapp`：微信小程序

## 项目概览

### 当前能力

- 管理端已覆盖学校、年级、班级、学生、教师、家长、每日作业、用餐记录、作业记录、缴费等管理能力
- 小程序已具备工作台、每日作业、用餐记录、作业记录、我的等业务页面
- 后端已提供认证、基础台账、记录管理、打印、文件上传与附件访问等接口
- 附件链路已经统一为“只存 `bucket/objectKey`，预览时动态生成访问地址”

### 技术栈

- Admin：React 19、TypeScript、Vite、shadcn/ui
- API：Go、Fiber、GORM
- WeApp：微信原生小程序、Vant Weapp
- Storage：本地存储 / 阿里云 OSS / 又拍云

## 仓库结构

```text
apps/
  admin/                   管理端
  api/                     后端接口
  weapp/                   微信小程序
    miniprogram/           小程序源码
    project.config.json    小程序工程配置
    release.json           小程序版本号
scripts/
  verify-weapp.mjs         小程序校验脚本
  weapp-env.mjs            小程序环境地址切换脚本
  weapp-version.mjs        小程序版本管理脚本
  weapp-upload.mjs         小程序上传脚本
docs/
  foundation-roadmap.md
  product-structure.md
  release-guide.md
  weapp-review-checklist.md
```

## 环境要求

建议本地准备以下环境：

- Node.js 22+
- pnpm 10+
- Go 1.24+
- 微信开发者工具
- Windows PowerShell 5.1+ 或 PowerShell 7+

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动管理端

```bash
pnpm dev:admin
```

### 启动后端

```bash
pnpm dev:api
```

### 打开小程序工程

```bash
pnpm dev:weapp
```

### 小程序校验

```bash
pnpm check:weapp
```

## 常用开发命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev:admin` | 启动管理端开发服务 |
| `pnpm build:admin` | 构建管理端 |
| `pnpm lint:admin` | 管理端 lint |
| `pnpm test:admin` | 管理端测试 |
| `pnpm dev:api` | 启动后端热更新 |
| `pnpm dev:weapp` | 尝试打开微信开发者工具 |
| `pnpm check:weapp` | 校验小程序工程 |
| `pnpm version:print` | 打印当前仓库发布版本 |

## 小程序版本管理与上传

### 约定

| 文件 | 是否提交 | 作用 |
| --- | --- | --- |
| `apps/weapp/release.json` | 是 | 小程序版本号与默认上传说明 |
| `apps/weapp/release.local.example.json` | 是 | 本地发布配置模板 |
| `apps/weapp/.release.local.json` | 否 | 本地私有发布配置 |
| `apps/weapp/miniprogram/config/env.js` | 是 | 小程序当前实际使用的接口地址 |

当前发布约定很简单：

- 版本号固定使用 `1.0.0` 这样的语义化版本
- 小程序只保留一条上传脚本，不区分开发版、体验版
- `env.js` 只保留一个当前地址
- 上传前自动切正式地址，上传后自动恢复开发地址
- 上传密钥、开发地址、正式地址统一放到本地未提交配置文件

### 常用命令

```bash
pnpm weapp:version -- show
pnpm weapp:version -- set 1.0.0
pnpm weapp:version -- bump patch
pnpm weapp:upload
pnpm weapp:upload -- --version 1.0.1 --desc 修复附件预览
```

### 说明

- `apps/weapp/.release.local.json` 不会提交到仓库
- `env.js` 已改成单地址模式
- 上传脚本会在上传前切正式地址，上传后自动恢复
- 更完整的小程序发布说明见 [docs/release-guide.md](./docs/release-guide.md)

## 后端与管理端发布

### 后端镜像

常用命令：

```bash
pnpm version:print
pnpm build:api-image
pnpm push:api-image -- -Version 20260410213045
pnpm buildpush:api-image -- -Version 20260410213045
pnpm deploy:api -- -Version 20260410213045
pnpm pushdeploy:api-image -- -Version 20260410213045
```

### 管理端部署

首次使用先复制本地部署配置：

```powershell
Copy-Item .\scripts\deploy-admin.config.example.psd1 .\scripts\deploy-admin.local.psd1
```

部署命令：

```bash
pnpm deploy:admin -- -Version 20260410213045
```

## 配置说明

### 后端配置

后端主配置文件位于 `apps/api/config/config.yaml`。

数据库当前支持：

- SQLite
- PostgreSQL

`wechat` 相关配置仍然保留，用于微信接口能力和开发兜底登录。

### 小程序配置

小程序发布相关配置分为两层：

- 可提交配置：`apps/weapp/release.json`
- 本地私有配置：`apps/weapp/.release.local.json`

这样的拆分可以保证：

- 版本号进入仓库，方便团队回看
- 上传密钥和环境地址不进入仓库

## 验证与检查

### 管理端

```bash
pnpm build:admin
pnpm lint:admin
pnpm test:admin
```

### 后端

```bash
cd apps/api
go test ./...
```

### 小程序

```bash
pnpm check:weapp
```

## 相关文档

- [产品结构](./docs/product-structure.md)
- [基础路线图](./docs/foundation-roadmap.md)
- [发布说明](./docs/release-guide.md)
- [小程序提审检查清单](./docs/weapp-review-checklist.md)

## 维护建议

- 小程序每次上传前，先明确版本号，再执行上传脚本
- 不要手动长期把 `env.js` 留在正式地址
- 小程序上传密钥只保存在本地，不要放进仓库
- 如果后续要接 CI/CD，可以直接复用当前 `release.json + .release.local.json + weapp-upload.mjs` 这套结构
