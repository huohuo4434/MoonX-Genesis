# MOOX Wave Analyst Module

波浪分析师数据源模块（已并入 MoonX Genesis）。

## 功能

- 保存波浪观点、支撑、压力、目标区间、时间窗口
- 按市场统计命中率
- 根据样本数、命中率、盈亏比和近期表现动态计算权重（初始 5%，最高 22%）
- 后台录入与验证：`/admin/wave`
- 会员页展示：`WaveIntelligenceCard` on `/member/tomorrow`
- 已内置黄金、SK海力士、闪迪、WTI 四条初始记录

## 安装 / 运维

1. Prisma 模型已在 `prisma/schema.prisma`（参考副本：`prisma/schema-wave.prisma`）
2. 依赖：`@prisma/client`、`prisma`、`zod`、`tsx`
3. 配置 `.env`：
   - `DATABASE_URL` — Postgres（可选；未配置时写入 `moonx-data/wave/store.json`）
   - `WAVE_ADMIN_KEY` — 可选 API 密钥（后台会话管理员也可写入）
4. 迁移与生成：

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed:wave
```

也可通过 `supabase/migrations/006_wave_analyst.sql` 与现有 SQL 迁移一并应用。

## API

- `GET /api/wave/latest`
- `GET /api/wave/ranking`
- `GET|POST /api/admin/wave`（管理员会话或 `x-admin-key`）
- `POST /api/admin/wave/validate`

## 权重

初始 5%，动态范围约 3%–22%。验证样本不足时不会冲到高权重。
