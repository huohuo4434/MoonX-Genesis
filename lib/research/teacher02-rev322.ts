export const TEACHER02_REV322_VERSION = "Rev3.2.2" as const;

export type Teacher02Rev322MarketKind = "CONTINUOUS_7X24" | "SECURITIES";
export type Teacher02Rev322RuleConfidence = "HIGH" | "MEDIUM" | "UNRECOVERABLE";

export type Teacher02Rev322Rule = {
  id: string;
  title: string;
  confidence: Teacher02Rev322RuleConfidence;
  summary: string;
  automaticUse: boolean;
};

export type Teacher02Rev322Segment = {
  label: "前段" | "中段" | "后段";
  ratioPct: 30 | 40;
  start: string;
  end: string;
  naturalDayCount: number;
};

export type Teacher02Rev322PathCalibration = {
  version: typeof TEACHER02_REV322_VERSION;
  marketKind: Teacher02Rev322MarketKind;
  totalNaturalDays: number;
  segments: Teacher02Rev322Segment[];
  appliedRuleIds: string[];
  weekendPolicy: string;
  summary: string;
  limitations: string[];
};

export const TEACHER02_REV322_SOURCE_META = {
  version: TEACHER02_REV322_VERSION,
  evidenceWindow: "YouTube 37:30–37:46.5",
  ingestedAt: "2026-08-02T22:20:00+08:00",
  sourceNature: "公开视频逐秒画面结构整理，不是原始Word逐字全文",
  replaces: "辅助导师02旧版不完整画面规则",
  locked: true,
} as const;

export const TEACHER02_REV322_EXECUTION_STEPS = [
  "继承年、季、月等大周期背景，先判断小周期顺势还是逆势修正。",
  "先用原始卦意、动爻爻辞、本卦／互卦／变卦和特殊卦象确定主方向与动作。",
  "执行八项预测前检查，再按自然日进行前30%／中40%／后30%的3/4/3切分。",
  "先裁决前段属于极小值／砸坑轨，还是极大值／冲高轨。",
  "传统证券使用补丁十九及G2／G3／G5校准交易日；7×24标的不做周末顺延。",
  "检查多周期共振与冲突，最后输出每段起止、关键卡点、接掌和资金动作。",
] as const;

export const TEACHER02_REV322_PREFLIGHT = [
  "T>7：任一单体主事天数超过7天时，标记复合交错或复合震荡并执行3/4/3。",
  "周末跨度：前30%的理论卡点是否跨周末。",
  "山地剥月令：当值或接掌遇山地剥时，先调用专属月令裁决。",
  "格式硬校验：卦名、定性词库、列表与日期格式不合格时禁止输出。",
  "能量影响区间：检查动爻和爻辞集中释放的时段。",
  "体生用／体克用：体生用不得误写为资金注入，主要按资金流出或动能受限解释。",
  "低位六冲二分：初爻或二爻独动时，先做多空二分，禁止直接套单边结论。",
  "7×24未月双峰：BTC、ETH等全天候标的在未月启用专属双峰检查，周末计入自然日。",
] as const;

export const TEACHER02_REV322_RULES: Teacher02Rev322Rule[] = [
  {
    id: "REV322-CONTEXT",
    title: "大周期继承与目标月令",
    confidence: "HIGH",
    summary: "目标月令使用预测区间所处月份；体用和月令只修正强弱、极值与恢复能力，不颠倒原始卦意。",
    automaticUse: true,
  },
  {
    id: "REV322-343",
    title: "3/4/3自然日切分",
    confidence: "HIGH",
    summary: "总周期按前30%、中40%、后30%切分；前段先判断极小值轨或极大值轨，中段处理爆破／换手／V形，后段处理收敛或尾部极端。",
    automaticUse: true,
  },
  {
    id: "REV322-G2",
    title: "G2本卦结束日",
    confidence: "HIGH",
    summary: "本卦结束日＝本卦起始日＋计算得出的当值天数－1天。",
    automaticUse: true,
  },
  {
    id: "REV322-G3",
    title: "G3非交易日校准",
    confidence: "HIGH",
    summary: "常规证券的结束、接掌或关键日落在周末／节假日时，向有效交易日校准；后续接掌同步对齐。",
    automaticUse: true,
  },
  {
    id: "REV322-G5",
    title: "G5周末起始日",
    confidence: "HIGH",
    summary: "常规证券即使从周末开始，起始日仍参与自然日计算；关键接掌与转折再执行G3。",
    automaticUse: true,
  },
  {
    id: "REV322-7X24-WEI",
    title: "7×24未月双峰过山车",
    confidence: "HIGH",
    summary: "未月前段偏冲高，中段偏深回踩或砸坑，后段可能出现周末V形修复；该模板不得套用到其他月份。",
    automaticUse: true,
  },
  {
    id: "REV322-MOVING-LINES",
    title: "动爻与爻辞时序",
    confidence: "HIGH",
    summary: "初二爻影响偏早，三四爻更易对应洗盘与换手，高位爻接近接掌或转折；多爻时低位爻通常先释放。",
    automaticUse: true,
  },
  {
    id: "REV322-SPECIAL-FILTERS",
    title: "特殊卦象滤网",
    confidence: "MEDIUM",
    summary: "山地剥、单双坤／乾、风山渐、水泽节、低位六冲及A／A2／B／E轨道只做路径分流；完整阈值未展示，不允许自动补造。",
    automaticUse: false,
  },
  {
    id: "REV322-G4-G6",
    title: "G4／G6未完整恢复",
    confidence: "UNRECOVERABLE",
    summary: "当前视频只确认G2–G6为同组规则，G4、G6正文与优先级没有完整展示。",
    automaticUse: false,
  },
];

export const TEACHER02_REV322_LIMITATIONS = [
  "原始Word完整页数、页首页尾及快速滚动中未停留的文字无法恢复。",
  "补丁十九关于周六、周日、法定节假日组合的全部分支未完整展示。",
  "G4、G6的逐条定义及G2–G6全部冲突优先级未完整展示。",
  "山地剥、坤／乾、风山渐、水泽节及A／A2／B／E轨道的全部阈值未完整展示。",
  "未完整规则只允许标注为待补充，不得由系统自行伪造。",
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Slice fixed positions after the format check so strict projects with
  // noUncheckedIndexedAccess never infer number | undefined here.
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(value: string, days: number): string {
  const parsed = parseDate(value);
  if (!parsed) return value;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDate(parsed);
}

function inclusiveDayCount(start: string, end: string): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 0;
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
  return diff >= 0 ? diff + 1 : 0;
}

function segmentCounts(total: number): [number, number, number] {
  if (total <= 0) return [0, 0, 0];
  if (total === 1) return [1, 0, 0];
  if (total === 2) return [1, 1, 0];

  let front = Math.max(1, Math.round(total * 0.3));
  let middle = Math.max(1, Math.round(total * 0.4));
  if (front + middle >= total) {
    middle = Math.max(1, total - front - 1);
  }
  const back = Math.max(1, total - front - middle);
  if (front + middle + back !== total) {
    front = total - middle - back;
  }
  return [front, middle, back];
}

export function teacher02Rev322MarketKindForAsset(assetId: string): Teacher02Rev322MarketKind {
  return /^(bitcoin|btc|ethereum|eth|hyperliquid|hype|asteroid)$/i.test(assetId)
    ? "CONTINUOUS_7X24"
    : "SECURITIES";
}

export function buildTeacher02Rev322PathCalibration(input: {
  assetId: string;
  forecastStart?: string | null;
  forecastEnd?: string | null;
}): Teacher02Rev322PathCalibration | null {
  const start = input.forecastStart ?? "";
  const end = input.forecastEnd ?? "";
  const totalNaturalDays = inclusiveDayCount(start, end);
  if (!totalNaturalDays) return null;

  const marketKind = teacher02Rev322MarketKindForAsset(input.assetId);
  const [frontCount, middleCount, backCount] = segmentCounts(totalNaturalDays);
  const frontEnd = addDays(start, Math.max(0, frontCount - 1));
  const middleStart = addDays(frontEnd, 1);
  const middleEnd = middleCount ? addDays(middleStart, middleCount - 1) : middleStart;
  const backStart = addDays(middleEnd, 1);
  const backEnd = backCount ? addDays(backStart, backCount - 1) : end;

  const allSegments: Teacher02Rev322Segment[] = [
    { label: "前段", ratioPct: 30, start, end: frontEnd, naturalDayCount: frontCount },
    { label: "中段", ratioPct: 40, start: middleStart, end: middleEnd, naturalDayCount: middleCount },
    { label: "后段", ratioPct: 30, start: backStart, end: backEnd, naturalDayCount: backCount },
  ];
  const segments = allSegments.filter((segment) => segment.naturalDayCount > 0);

  const weekendPolicy =
    marketKind === "CONTINUOUS_7X24"
      ? "7×24标的按自然日连续计算，周六和周日不顺延。"
      : "常规证券先保留自然日切分；关键卡点落周末时执行G3校准，法定节假日仍需交易日历确认。";
  const summary = `按${TEACHER02_REV322_VERSION}已知规则完成自然日3/4/3：${segments
    .map((segment) => `${segment.label}${segment.start}至${segment.end}`)
    .join("，")}。${weekendPolicy}`;

  return {
    version: TEACHER02_REV322_VERSION,
    marketKind,
    totalNaturalDays,
    segments,
    appliedRuleIds: [
      "REV322-CONTEXT",
      "REV322-343",
      "REV322-G2",
      ...(marketKind === "SECURITIES" ? ["REV322-G3", "REV322-G5"] : []),
    ],
    weekendPolicy,
    summary,
    limitations: [...TEACHER02_REV322_LIMITATIONS],
  };
}
