# MOOX 多源K线与市场微观结构引擎 V7.19.0

## 数据源分工

- Binance现货：加密K线主源；日线、周线使用UTC+8边界。
- OKX现货：第二交易所校验。
- Bitget U本位合约：备用K线和执行交易所价格参考。
- Binance USDⓈ-M公开数据：标记价格、指数价格、资金费率、持仓量、多空比、主动买卖量和基差。
- CoinGecko：全市场市值、成交量、市占率和热门搜索。

## 数据质量

1. 只使用已经闭合的K线。
2. 多源价格一致时允许生成精确技术位。
3. 数据源不足或价格偏差过大时，`precisionLevelsAllowed=false`，页面显示暂停精确点位。
4. 单个数据源失败时安全降级；不会伪造K线。

## 预测治理

多源K线、缠论和资金结构只负责位置、确认、失效和仓位风险，权限为 `EXECUTION_ONLY`。

- `canOverrideFormalDirection=false`
- `autoTradingChanged=false`

周卦、月卦和已经锁定的正式预测仍然拥有唯一方向权。
