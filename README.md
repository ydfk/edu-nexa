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

### 微信小程序

使用微信开发者工具打开 `apps/weapp`，`miniprogramRoot` 已配置为 `miniprogram`。

## 当前基础能力

- 账号体系按手机号统一设计，管理员、教师、监护人、学生四类角色可复用同一账号
- 管理端走手机号 + 密码登录
- 小程序走微信登录态 + 获取手机号授权
- 管理端已具备登录页、会话存储和路由守卫基础结构
- 小程序已具备会话落盘能力，开发环境可通过 `apps/api/config/config.yaml` 中的 `wechat.dev_phone` 走通手机号登录链路
- 后端已落地 `auth`、`health`、`overview`、`campuses`、`students`、`meal-records`、`homework-records` 路由占位
- 管理后台已改成真实业务导航，不再保留模板组件示例入口
- 小程序已具备工作台、用餐、作业、我的四个页面，以及接口层、状态层、环境配置占位

下一步建议见 [docs/product-structure.md](/F:/github-my/edu-nexa/docs/product-structure.md) 和 [docs/foundation-roadmap.md](/F:/github-my/edu-nexa/docs/foundation-roadmap.md)。
