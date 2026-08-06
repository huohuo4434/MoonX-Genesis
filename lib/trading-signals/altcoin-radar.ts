import type { ExternalAnalystParsedPost } from "@/types/external-analyst";

export type AltcoinRadarStage = "EARLY_WATCH" | "CONFIRMATION" | "OVERHEATED" | "OBSERVE";

export interface AltcoinRadarAssessment {
  stage: AltcoinRadarStage;
  labelZh: string;
  labelEn: string;
  actionZh: string;
  actionEn: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export function assessAltcoinRadarPost(post: Pick<ExternalAnalystParsedPost, "text" | "direction" | "symbols">): AltcoinRadarAssessment {
  const text = post.text.toLowerCase();
  const overheated = /翻倍|暴涨|起飞|新高|拉盘|爆拉|已经涨|涨幅|100%|200%|moon|parabolic|all[- ]time high/.test(text);
  if (overheated) {
    return {
      stage: "OVERHEATED",
      labelZh: "可能已过热",
      labelEn: "Possibly overheated",
      actionZh: "不追高；等待回踩、换手和结构确认。",
      actionEn: "Do not chase; wait for a retest, turnover and structure confirmation.",
      risk: "HIGH",
    };
  }

  const early = /埋伏|提前|低位|底部|还没涨|尚未启动|低估|关注名单|观察名单|潜伏|early|undervalued|before.*move/.test(text);
  if (early && post.direction !== "SHORT") {
    return {
      stage: "EARLY_WATCH",
      labelZh: "早期观察",
      labelEn: "Early watch",
      actionZh: "先加入观察；仅在流动性、成交量与失效条件明确后考虑小仓。",
      actionEn: "Add to watch first; consider a small position only after liquidity, volume and invalidation are clear.",
      risk: "MEDIUM",
    };
  }

  const confirmation = /突破|站稳|放量|启动|回踩确认|breakout|confirmed|volume expansion/.test(text);
  if (confirmation && post.direction === "LONG") {
    return {
      stage: "CONFIRMATION",
      labelZh: "等待确认 / 已出现触发",
      labelEn: "Confirmation watch",
      actionZh: "核对价格是否仍在触发区附近；偏离过大则放弃追单。",
      actionEn: "Check whether price is still near the trigger zone; skip the trade if it has moved too far.",
      risk: "MEDIUM",
    };
  }

  return {
    stage: "OBSERVE",
    labelZh: "信息观察",
    labelEn: "Observe",
    actionZh: post.symbols.length ? "记录币种和叙事，等待价格、成交量与链上流动性共同确认。" : "暂未提取到明确币种，不转化为交易信号。",
    actionEn: post.symbols.length ? "Record the asset and narrative, then wait for price, volume and on-chain liquidity confirmation." : "No clear asset was extracted; do not convert this into a trade signal.",
    risk: post.direction === "NEUTRAL" ? "LOW" : "MEDIUM",
  };
}
