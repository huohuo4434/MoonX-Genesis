# 技术信号录入规范

MoonX 技术信号只接受人工整理的研究记录，不接入实时行情，也不会自动识别背离。请将正式记录加入 `content/moonx/technical-signals.json`；每条记录会独立经过 Schema 校验，错误记录会被跳过且不会中断页面。

## 必填要求

- 使用稳定且唯一的 `id`，推荐格式：`资产-周期-信号类型-日期`。
- `title`、`summary`、确认条件、失效条件和状态历史必须同时提供 `zhCN`、`zhTW`、`en`。
- `status` 必须体现结构阶段，不能把“指标未创新高”直接记录为 `confirmed`。
- 所有时间使用带时区的 ISO 8601 格式，例如 `2026-07-27T08:00:00+08:00`。
- 只有人工研究可使用 `sourceType: "manual_research"` 与 `framework: "technical_structure"`。
- 已验证结果要保留原始状态、确认/失效条件及 `outcome`；不得改写原始信号美化历史。

## 非正式示例

以下示例仅用于录入说明，不能复制到正式 JSON 后当作真实研究记录：

```json
{
  "id": "btc-4h-macd-bearish-2026-07-27",
  "assetId": "bitcoin",
  "symbol": "BTC",
  "signalType": "macd_bearish_divergence",
  "direction": "bearish",
  "timeframe": "4h",
  "horizon": "swing",
  "detectedAt": "2026-07-27T08:00:00+08:00",
  "status": "warning",
  "originalStatus": "observing",
  "statusHistory": [
    {
      "status": "observing",
      "changedAt": "2026-07-27T08:00:00+08:00",
      "note": { "zhCN": "示例：开始观察结构。", "zhTW": "示例：開始觀察結構。", "en": "Example: structure observation began." }
    }
  ],
  "title": { "zhCN": "BTC四小时MACD顶背离预警", "zhTW": "BTC四小時MACD頂背離預警", "en": "BTC 4H MACD Bearish Divergence Warning" },
  "summary": { "zhCN": "示例：价格走强但MACD动能未同步增强。", "zhTW": "示例：價格走強但MACD動能未同步增強。", "en": "Example: price strengthened while MACD momentum did not confirm." },
  "evidence": [],
  "confirmationConditions": [{ "zhCN": "示例：跌破前一结构低点。", "zhTW": "示例：跌破前一結構低點。", "en": "Example: break below the prior structural low." }],
  "invalidationConditions": [{ "zhCN": "示例：价格与MACD同步创新高。", "zhTW": "示例：價格與MACD同步創新高。", "en": "Example: price and MACD make new highs together." }],
  "framework": "technical_structure",
  "sourceType": "manual_research",
  "createdAt": "2026-07-27T08:00:00+08:00",
  "updatedAt": "2026-07-27T08:00:00+08:00"
}
```
