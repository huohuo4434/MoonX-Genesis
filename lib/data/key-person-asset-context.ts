export type KeyPersonBias = "SUPPORT" | "RISK" | "MIXED";

export type KeyPersonWindow = {
  start: string;
  end: string;
  labelZh: string;
  bias: KeyPersonBias;
  sourceStatusZh: string;
};

export type KeyPersonAssetContext = {
  personId: string;
  personZh: string;
  personEn: string;
  relatedSlugs: string[];
  relationshipZh: string;
  assumedChart: string;
  calibrationStatusZh: string;
  summaryZh: string;
  windows: KeyPersonWindow[];
  disclosureZh: string;
};

/**
 * Client-safe projection of the existing teacher archive. This file does not
 * calculate a new chart and does not turn a key-person cycle into a stock call.
 */
export const KEY_PERSON_ASSET_CONTEXTS: KeyPersonAssetContext[] = [
  {
    personId: "ELON_MUSK",
    personZh: "埃隆·马斯克",
    personEn: "Elon Musk",
    relatedSlugs: ["tsla", "spcx"],
    relationshipZh: "核心人物关联",
    assumedChart: "辛亥 / 甲午 / 甲申 / 丁卯",
    calibrationStatusZh: "候选命盘；出生时刻证据待补",
    summaryZh: "老师资料把人物周期作为公司执行力、治理、融资、声誉和突发事件的辅助观察层；人物结论不能独立替代个股六爻、奇门与基本面判断。",
    windows: [
      {
        start: "2028-01-01",
        end: "2028-12-31",
        labelZh: "老师资料提出2028年可能出现重大风险，同时保留TSLA仍可能有转机的并行分支。",
        bias: "RISK",
        sourceStatusZh: "老师主张待验证",
      },
    ],
    disclosureZh: "人物资料未独立校时，当前仅作低权重风险叠加。与个股方向同向时标记共振，反向时标记背离；两种情况都不直接改写股票方向。",
  },
];

export function getKeyPersonContextForAsset(slug: string): KeyPersonAssetContext | null {
  return KEY_PERSON_ASSET_CONTEXTS.find((item) => item.relatedSlugs.includes(slug)) ?? null;
}

export function activeKeyPersonWindow(context: KeyPersonAssetContext, asOfDate: string): KeyPersonWindow | null {
  return context.windows.find((window) => asOfDate >= window.start && asOfDate <= window.end) ?? null;
}
