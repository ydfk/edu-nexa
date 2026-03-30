# 小程序过审约束

## 这一版最重要的审查风险

- 小程序会处理手机号、学生信息、监护人关系、图片、文字反馈，必须补齐用户隐私保护指引
- 教师会输入文字并上传图片，服务端必须接入内容安全检测，不能只靠前端限制
- 内容安全不能完全依赖机器审核，高风险内容仍要预留人工复核能力
- 家长端应只展示自己绑定学生的数据，教师端和管理员端必须严格鉴权

## 结合当前产品的提审建议

- 首页不要做成开放社区，不要出现可公开发布、评论、互动广场之类入口
- 家长端先只做查看，不做公开分享、排行榜、评论区
- 缴费相关能力第一版建议定义为内部服务状态管理，不要先上在线支付、充值、套餐购买
- 提审描述和服务类目要与“托管 / 教育服务 + 家校反馈”一致
- 登录后如果是教师端或管理员端，页面文案要明确是机构内部工作台，不要做成泛社交工具

## 技术落地清单

- 手机号、头像、学生信息、图片上传都要进入隐私声明
- 提审版本和现网版本都要同步维护隐私指引
- 用餐备注、作业备注走文本安全检测
- 用餐图片、作业图片走多媒体内容安全检测
- 图片或文字命中可疑结果时，需要进入人工复核或暂不展示
- 监护人查询接口必须按绑定关系做数据隔离

## 官方文档

- 微信开发者文档：用户隐私保护指引填写说明  
  <https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/>
- 微信开发者文档：健康运营指引  
  <https://developers.weixin.qq.com/miniprogram/dev/framework/operation.html>
- 微信开发者文档：小程序安全接口列表  
  <https://developers.weixin.qq.com/miniprogram/dev/server/API/sec-center/>
- 微信开发者文档：文本内容安全识别 `msgSecCheck`  
  <https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html>
- 微信开发者文档：多媒体内容安全识别 `mediaCheckAsync`  
  <https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/mediaCheckAsync.html>

## 我基于官方文档做出的推断

- “缴费”更适合作为内部服务状态，而不是首版面向家长的交易入口，这样更稳
- 首页介绍、服务说明、教师工作台、家长查看页要和提审类目保持一致，否则容易在审核描述上出现偏差
- 如果后续要加在线支付、充值、套餐购买，需要单独核对支付能力、类目和交易保障要求
