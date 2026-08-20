# MOOX V7.20.10.8 — 1000U 实盘激活顺序

本补丁不会自动下单，也不会自动开启 LIVE。

## 为什么当前 0 单

如果会员 AI 实盘页面显示 `Unified Live 数据库迁移未完成`，那么 0 尝试 / 0 开仓是预期结果：安全闸门正在阻断真钱开仓。

V7.20.10.8 修复一个诊断误导：以前数据库缺表时 API 会提前返回，导致页面把 Bitget 显示成“密钥未就绪”，即使真实原因只是数据库尚未迁移。新版在数据库缺表时仍继续检查生产环境、Bitget 只读访问和 Cron 心跳。

## 正确顺序

1. 运行 `START_MOOX_UPGRADE.cmd`，必须看到 `UPGRADE VALIDATION PASSED`。
2. 运行 `CHECK_1000U_LIVE_READINESS.cmd`。这是只读检查，不下单、不改数据库。
3. 如果检查明确显示 **只有** `20260818143000_moox_unified_live_v72031` 待迁移，再运行 `APPLY_UNIFIED_LIVE_MIGRATION.cmd`，并手工输入 `APPLY`。
4. 数据库迁移脚本优先使用 `DIRECT_URL` 或 `MIGRATION_DATABASE_URL`；如果只有 Supabase/Supavisor 6543 transaction pooler，会拒绝迁移，避免 Prisma 锁/DDL 出错。
5. 生产环境确认以下有效配置（不要把密钥发给任何人）：
   - `MOOX_UNIFIED_LIVE_MODE=LIVE`
   - `MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH=true`
   - `MOOX_UNIFIED_LIVE_NEW_ENTRIES=true`
   - `MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT=true`
   - `MOOX_LIVE_ACTIVE_EXECUTION_V641=true`（或至少不要显式 false）
   - `BITGET_TRADING_MODE=LIVE_EXPERIMENT`
   - `BITGET_LIVE_API_KEY`
   - `BITGET_LIVE_SECRET_KEY`
   - `BITGET_LIVE_PASSPHRASE`
   - `BITGET_LIVE_EXECUTION_ALLOWED=true`
   - `BITGET_LIVE_CONFIRMATION=I_ACCEPT_REAL_LOSS`
   - `BITGET_LIVE_INITIAL_CAPITAL_USDT=1000`
   - `CRON_SECRET`
6. 重新部署生产。
7. 打开 `会员频道 → AI实盘交易`。五步检查必须依次变绿：数据库、环境、Bitget只读、每分钟Cron、官方账户。
8. 前四步通过后，“启用1000U实盘”按钮才可点击；仍需手工输入 `LIVE1000`。

## 安全边界

- 本补丁不修改策略逻辑、杠杆上限、止损、日亏/回撤上限。
- 数据库迁移脚本不访问 Bitget。
- 安装脚本不迁数据库、不修改 Vercel 环境、不切 LIVE。
- 页面只显示环境变量名是否就绪，不返回 API Key / Secret / Passphrase 值。
