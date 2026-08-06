# MOOX AI 实盘主动执行纠正 V6.4.1

## 为什么需要本补丁

V6.4保留了原有实盘下单通道，但新增的“每日活动目标、主动候选筛选、分批探路仓”主要接在Demo分支；实盘仍使用较保守的旧兜底逻辑。V6.4.1把这些主动执行能力接到现有实盘授权链，并修正可靠性面板把实盘误显示为Demo永久锁定的问题。

## 实盘执行流程

1. 使用实时K线、锁定预测和六爻软先验形成方向。
2. 正常确认条件满足时按三周期策略执行。
3. 北京时间9点后，如果当日实盘成交未达到2笔，从本轮已扫描候选中选择综合得分靠前者，以小风险第一批探路仓执行。
4. 第二批必须等待至少5分钟、方向继续确认且交易所保护单存在。
5. 日亏损、总回撤、持仓数量、总敞口、相关资产风险、单品种次数、行情新鲜度、时钟和可靠性闸门仍不可绕过。

“每日2笔”是主动寻找机会的目标，不是无条件强制成交。缺少报价、合约不存在、账户余额/权限异常、风控触发、保护单异常或交易所拒单时仍禁止开仓。

## 现有Vercel变量兼容

本补丁直接识别已有变量：

- `BITGET_LIVE_MAX_DRAWDOWN_USDT`
- `BITGET_LIVE_DAILY_LOSS_USDT`
- `BITGET_LIVE_MAX_CONCURRENT_POSITIONS`
- `BITGET_LIVE_MAX_TRADES_PER_DAY`

不再要求为了同一含义另建一套V3变量。

## 必须保持的实盘授权

- `BITGET_TRADING_MODE=LIVE_EXPERIMENT`（也接受`LIVE`）
- `BITGET_LIVE_EXECUTION_ALLOWED=true`
- `BITGET_LIVE_CONFIRMATION=I_ACCEPT_REAL_LOSS`
- 正确的实盘API Key、Secret和Passphrase

## 默认参数

- 杠杆：读取`BITGET_LIVE_LEVERAGE`，建议2
- 每日活动目标：2笔
- 活动检查开始：北京时间9点
- 活动探路风险：账户权益0.10%
- 单品种每日上限：2笔
- 全局上限：沿用`BITGET_LIVE_MAX_TRADES_PER_DAY`

可选覆盖变量见部署说明。
