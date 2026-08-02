# MOOX 网站全景体检：P0 执行记录（2026-08-02）

本次升级按 Codex 审阅报告优先处理“稳定性、可信口径和交付链路”，不新建项目、不重建数据库、不修改生产密钥。

## 已执行

1. 四个六爻后台路由增加兼容数据加载与错误边界：主 Prisma 表可用时读取主表；缺表、迁移不完整或查询失败时自动降级到老师知识库，避免整页 Server Components 崩溃。
2. 统一前台品牌为 MOOX Intelligence；新订单前缀改为 MOOX；付款与开通邮件标题改为 MOOX。
3. 公开验证和后台首页使用同一个 `getPublicAccuracyHistory()` 口径；增加验证规则说明与 CSV/JSON 下载。
4. Vibe 内置数据明确显示为“快照”，不再把快照质量分冒充实时新鲜度 100%。
5. 英文内容未完成前默认隐藏 English 入口。只有设置 `NEXT_PUBLIC_ENABLE_ENGLISH=true` 才重新开放。
6. 方法论改为公开、可索引页面并进入主导航；新增客服与 FAQ 页面。
7. 导航改为紧凑主菜单 + 更多，移动端点击区域提高到至少 44px。
8. 新增 Open Graph、Twitter Card、Organization JSON-LD、methodology/support sitemap 与 robots 配置。
9. 正式付款统计默认排除 `isTest` 订单；管理员用户页把高置信度沙盒账号独立分组。
10. 邮件和社交卡增加一次瞬时错误重试；网站诊断显示邮件生产就绪状态、今日社交卡和交付缺口。
11. AI 信号增加星级、共识分、执行状态与风险的公开说明。

## 需要管理员在外部完成

- 在 Resend 验证 `mooxintel.com`，并在 Vercel 配置 `MOOX_EMAIL_FROM` 与 `PAYMENT_NOTIFICATION_EMAIL`。
- 完整英文内容翻译、母语复核完成后，才设置 `NEXT_PUBLIC_ENABLE_ENGLISH=true`。
- staging / production 数据库、钱包、邮件与密钥的物理隔离属于部署治理，代码包不会擅自迁移生产数据。
- 管理员 MFA、双人审批和法律文本主体信息需要结合实际公司主体与账户系统继续配置。

## 验收

安装器依次执行：静态报告回归检查 → TypeScript typecheck → Next.js production build。任一失败自动恢复本次覆盖前文件。
