# 学栖 · EduNexa

面向托管机构的运营产品，当前先聚焦两条核心业务链路：

- 晚辅用餐登记
- 作业完成与反馈记录

## 当前仓库结构

```text
apps/
  admin/   React 管理后台
  api/     Go Fiber 后端接口
  weapp/   微信小程序原生骨架
docs/
  product-structure.md
  foundation-roadmap.md
  weapp-review-checklist.md
```

## 本地启动

### 管理后台

```bash
pnpm install --dir apps/admin
pnpm --dir apps/admin dev
```

### 后端接口

```bash
cd apps/api
go run ./cmd
```

Windows 下也可以直接使用热更新脚本：

```bat
scripts\dev.bat
```

这条脚本会：

- 自动检查 `air` 是否已安装
- 未安装时自动执行 `go install github.com/air-verse/air@latest`
- 启动前检查配置端口占用，自动清理残留的 `api-dev.exe`
- 使用 [apps/api/.air.toml](/F:/github-my/edu-nexa/apps/api/.air.toml) 启动后端热更新

### 微信小程序

使用微信开发者工具打开 `apps/weapp`，`miniprogramRoot` 已配置为 `miniprogram`。

## 小程序调试建议

### 一键启动

```bash
pnpm dev:weapp
```

这条命令会：

- 按 `.vscode/settings.json` 中的 `edunexa.wechatDevtoolsPath` 尝试打开微信开发者工具
- 打开 `apps/weapp` 目录，方便在微信开发者工具中直接导入
- 打印当前小程序工程信息

### VS Code

仓库已提供：

- 任务：`EduNexa: 打开微信小程序工程`
- 调试：`EduNexa: 打开微信小程序工程`

推荐顺序：

1. 在 VS Code 运行 `EduNexa: 打开微信小程序工程`
2. 在微信开发者工具导入 `apps/weapp`
3. 按需手动启动后端服务

微信开发者工具路径配置示例：

```json
{
  "edunexa.wechatDevtoolsPath": "D:\\Program Files (x86)\\Tencent\\微信web开发者工具"
}
```

## 当前基础能力

- 账号体系按手机号统一设计，管理员、教师、监护人、学生四类角色可复用同一账号
- 管理端走手机号 + 密码登录
- 小程序走微信登录态 + 获取手机号授权
- 管理端已具备登录页、会话存储和路由守卫基础结构
- 小程序已具备会话落盘能力，开发环境可通过 `apps/api/config/config.yaml` 中的 `wechat.dev_phone` 走通手机号登录链路
- 后端已落地 `auth`、`overview`、`campuses`、`students`、`guardians`、`teachers`、`student-services`、`service-days`、`daily-homework`、`meal-records`、`homework-records` 基础接口
- 管理后台已补到学生台账、每日作业、服务日历、用餐记录、作业记录等业务导航
- 小程序已具备工作台、用餐、作业、我的四个页面，以及接口层、状态层、环境配置占位

下一步建议见 [docs/product-structure.md](/F:/github-my/edu-nexa/docs/product-structure.md)、[docs/foundation-roadmap.md](/F:/github-my/edu-nexa/docs/foundation-roadmap.md) 和 [docs/weapp-review-checklist.md](/F:/github-my/edu-nexa/docs/weapp-review-checklist.md)。
