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

这是当前仓库里最重要的一套小程序发布约定。

### 设计目标

- 版本号使用固定语义化格式，例如 `1.0.0`
- 小程序代码上传只保留一条脚本链路，不区分开发版、体验版
- 小程序源码中的 `env.js` 只维护一个当前地址
- 上传前自动切换为线上地址，上传后自动恢复为开发地址
- 上传密钥、开发地址、正式地址统一存放在本地未提交配置文件中

### 相关文件

| 文件 | 是否提交 | 作用 |
| --- | --- | --- |
| `apps/weapp/release.json` | 是 | 小程序版本号与默认上传说明 |
| `apps/weapp/release.local.example.json` | 是 | 本地发布配置模板 |
| `apps/weapp/.release.local.json` | 否 | 本地私有发布配置 |
| `apps/weapp/miniprogram/config/env.js` | 是 | 小程序当前实际使用的接口地址 |

### 第一次使用

1. 复制本地配置模板

```powershell
Copy-Item .\apps\weapp\release.local.example.json .\apps\weapp\.release.local.json
```

2. 编辑 `apps/weapp/.release.local.json`

示例：

```json
{
  "privateKeyPath": "C:/wechat/keys/edunexa.private.key",
  "devBaseURL": "http://127.0.0.1:33001/api",
  "prodBaseURL": "https://yyxw-api.ydfk.site/api",
  "robot": 1
}
```

字段说明：

- `privateKeyPath`：微信小程序代码上传密钥路径
- `devBaseURL`：本地开发接口地址
- `prodBaseURL`：正式接口地址
- `robot`：默认上传机器人编号，通常保留为 `1`

3. 确认微信后台已完成以下准备

- 已下载代码上传密钥
- 上传机器 IP 已加入小程序后台白名单

### 版本管理命令

查看当前版本：

```bash
pnpm weapp:version -- show
```

直接设置版本：

```bash
pnpm weapp:version -- set 1.0.0
```

递增补丁版本：

```bash
pnpm weapp:version -- bump patch
```

递增次版本：

```bash
pnpm weapp:version -- bump minor
```

递增主版本：

```bash
pnpm weapp:version -- bump major
```

修改默认上传说明：

```bash
pnpm weapp:version -- desc 修复附件预览与版本管理脚本
```

### 环境地址命令

查看当前小程序接口地址：

```bash
pnpm weapp:env -- show
```

切回开发地址：

```bash
pnpm weapp:env -- dev
```

手动切到正式地址：

```bash
pnpm weapp:env -- prod
```

### 上传命令

使用 `release.json` 中的版本号上传：

```bash
pnpm weapp:upload
```

上传时直接指定版本号：

```bash
pnpm weapp:upload -- --version 1.0.1
```

上传时临时指定说明：

```bash
pnpm weapp:upload -- --desc 修复每日作业附件预览
```

同时指定版本号和说明：

```bash
pnpm weapp:upload -- --version 1.0.2 --desc 修复记录附件链路
```

### 上传脚本实际做了什么

`pnpm weapp:upload` 的流程如下：

1. 读取 `apps/weapp/release.json`
2. 读取 `apps/weapp/.release.local.json`
3. 将 `env.js` 临时切换为正式地址
4. 自动执行 `pnpm check:weapp`
5. 调用 `miniprogram-ci` 上传小程序代码
6. 无论上传成功还是失败，都会将 `env.js` 恢复为开发地址

### 注意事项

- `apps/weapp/.release.local.json` 已加入 `.gitignore`，不会提交到仓库
- `env.js` 已经简化为单地址模式，旧的 `env.local.js` 不再参与版本切换
- 如果上传时传入 `--version`，脚本会同步更新 `apps/weapp/release.json`

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
