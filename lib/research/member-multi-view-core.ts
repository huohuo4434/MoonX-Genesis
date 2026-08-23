// MOOX_MEMBER_MULTI_VIEW_CORE_V720107_ASSET_MATRIX

export type MultiViewDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type MultiViewHorizon = "SHORT" | "MEDIUM" | "LONG" | "UNSPECIFIED";

export type MultiViewTheory =
  | "缠论"
  | "江恩"
  | "艾略特波浪"
  | "周期"
  | "宏观"
  | "基本面/财报"
  | "量价"
  | "价格行为"
  | "六爻"
  | "奇门"
  | "八字/命理"
  | "综合技术";

export type TheoryReading = {
  theory: MultiViewTheory;
  score: number;
  explanation: string;
};

export type MultiViewLevel = {
  label: "支撑" | "压力" | "目标" | "失效";
  value: string;
};

export type MultiViewBrief = {
  researcherCode: string;
  direction: MultiViewDirection;
  horizon: MultiViewHorizon;
  theories: TheoryReading[];
  assets: string[];
  summary: string;
  levels: MultiViewLevel[];
};

export type MultiViewConsensusDirection = MultiViewDirection | "MIXED";

const THEORY_ANALYST_LABELS: Record<MultiViewTheory, string> = {
  "缠论": "缠论分析师",
  "江恩": "江恩分析师",
  "艾略特波浪": "波浪分析师",
  "周期": "周期分析师",
  "宏观": "宏观分析师",
  "基本面/财报": "基本面分析师",
  "量价": "量价分析师",
  "价格行为": "价格行为分析师",
  "六爻": "六爻分析师",
  "奇门": "奇门分析师",
  "八字/命理": "命理周期分析师",
  "综合技术": "综合技术分析师",
};

/** Member-facing alias only. The stable numeric suffix prevents same-school collisions. */
export function buildMultiViewResearcherAlias(
  researcherCode: string,
  theories: readonly Pick<TheoryReading, "theory">[],
): string {
  const primary = theories[0]?.theory ?? "综合技术";
  const suffix = researcherCode.match(/\d{4}/)?.[0] ?? String(1000 + (stableHash(researcherCode) % 9000));
  return `${THEORY_ANALYST_LABELS[primary]} ${suffix}`;
}

export function summarizeMultiViewConsensus(input: {
  bullish: number;
  bearish: number;
  mixed: number;
  neutral: number;
}): { direction: MultiViewConsensusDirection; percent: number; sampleSize: number } {
  const sampleSize = Math.max(0, input.bullish) + Math.max(0, input.bearish) + Math.max(0, input.mixed) + Math.max(0, input.neutral);
  if (!sampleSize) return { direction: "NEUTRAL", percent: 0, sampleSize: 0 };
  const directional = [
    ["BULLISH", Math.max(0, input.bullish)],
    ["BEARISH", Math.max(0, input.bearish)],
    ["MIXED", Math.max(0, input.mixed)],
    ["NEUTRAL", Math.max(0, input.neutral)],
  ] as const;
  const max = Math.max(...directional.map((row) => row[1]));
  const leaders = directional.filter((row) => row[1] === max && row[1] > 0);
  return {
    direction: leaders.length === 1 ? leaders[0]![0] : "MIXED",
    percent: Math.round((max / sampleSize) * 100),
    sampleSize,
  };
}

/**
 * Conservative promotion gate for future external-source verification.
 * A source receives no predictive weight before ten locked, time-bounded samples.
 * Even a strong source remains a small research overlay and never owns direction.
 */
export function multiViewVerifiedResearchWeight(input: {
  sampleCount: number;
  weightedHitRatePct: number | null;
}): 0 | 1 | 2 | 3 {
  const samples = Math.max(0, Math.floor(input.sampleCount));
  const rate = input.weightedHitRatePct;
  if (samples < 10 || rate == null || !Number.isFinite(rate)) return 0;
  if (rate >= 70) return 3;
  if (rate >= 65) return 2;
  if (rate >= 60) return 1;
  return 0;
}

const METHOD_RULES: ReadonlyArray<{
  theory: MultiViewTheory;
  keywords: readonly string[];
  explanation: string;
}> = [
  {
    theory: "缠论",
    keywords: ["缠论", "中枢", "背驰", "一买", "二买", "三买", "一卖", "二卖", "三卖", "笔", "线段", "分型"],
    explanation: "以笔、线段、中枢、背驰与买卖点判断结构级别和转折。",
  },
  {
    theory: "江恩",
    keywords: ["江恩", "gann", "角度线", "时间之窗", "时间窗", "平方九宫", "九方图", "轮中轮", "江恩线"],
    explanation: "以时间—价格比例、角度与关键时间窗口判断趋势转折。",
  },
  {
    theory: "艾略特波浪",
    keywords: ["艾略特", "elliott", "推动浪", "调整浪", "主升浪", "abc", "a浪", "b浪", "c浪", "1浪", "2浪", "3浪", "4浪", "5浪", "波浪"],
    explanation: "以推动浪、调整浪与波浪级别推演趋势阶段和目标区。",
  },
  {
    theory: "周期",
    keywords: ["周期", "cycle", "季节性", "时间周期", "时间窗口", "时间窗", "中期选举", "四年周期", "减半周期", "月份规律"],
    explanation: "以历史节奏、季节性和时间窗口判断行情何时增强或转折。",
  },
  {
    theory: "宏观",
    keywords: ["美联储", "fed", "cpi", "ppi", "非农", "就业", "利率", "降息", "加息", "国债", "收益率", "美元", "流动性", "通胀", "关税", "地缘", "中东"],
    explanation: "以利率、流动性、通胀、政策和地缘变量解释市场风险偏好。",
  },
  {
    theory: "基本面/财报",
    keywords: ["财报", "营收", "收入", "利润", "毛利率", "eps", "指引", "订单", "估值", "市盈率", "现金流", "capex", "资本开支", "基本面", "供需", "库存"],
    explanation: "以财报、盈利质量、估值、订单和产业供需判断中期价值。",
  },
  {
    theory: "量价",
    keywords: ["成交量", "放量", "缩量", "量价", "换手", "资金流", "主力资金", "净流入", "净流出", "筹码"],
    explanation: "以成交量、资金流与价格配合判断突破、承接和抛压是否真实。",
  },
  {
    theory: "价格行为",
    keywords: ["支撑", "压力", "阻力", "突破", "跌破", "回踩", "趋势线", "平台", "箱体", "前高", "前低", "结构位", "止损", "失效", "供给区", "需求区"],
    explanation: "以支撑、压力、突破、回踩和失效位构建可执行的价格地图。",
  },
  {
    theory: "六爻",
    keywords: ["六爻", "世爻", "应爻", "财爻", "子孙", "官鬼", "兄弟爻", "父母爻", "动爻", "变爻", "空亡", "入墓"],
    explanation: "以六亲、世应、动变、旺衰和应期判断方向与风险节奏。",
  },
  {
    theory: "奇门",
    keywords: ["奇门", "九宫", "值符", "值使", "开门", "休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "九星", "八神"],
    explanation: "以宫位、门星神、旺衰与时空关系判断方向和时间节奏。",
  },
  {
    theory: "八字/命理",
    keywords: ["八字", "命理", "大运", "流年", "流月", "天干", "地支", "十神", "五行"],
    explanation: "以干支、五行、流年流月等节奏辅助判断时间周期。",
  },
];

const ASSET_RULES: ReadonlyArray<{ label: string; patterns: readonly string[] }> = [
  { label: "BTC", patterns: ["btc", "比特币", "bitcoin"] },
  { label: "ETH", patterns: ["eth", "以太坊", "ethereum"] },
  { label: "SOL", patterns: ["sol", "solana"] },
  { label: "HYPE", patterns: ["hype", "hyperliquid"] },
  { label: "SPX", patterns: ["spx", "标普", "s&p"] },
  { label: "NDX", patterns: ["ndx", "纳指", "纳斯达克", "qqq"] },
  { label: "GOLD", patterns: ["黄金", "gold", "xau"] },
  { label: "SILVER", patterns: ["白银", "silver", "xag"] },
  { label: "WTI", patterns: ["wti", "原油", "油价"] },
  { label: "SHCOMP", patterns: ["上证", "a股", "沪指"] },
  { label: "HSTECH", patterns: ["恒生科技", "hstech", "恒科"] },
  { label: "GOOGL", patterns: ["googl", "goog", "谷歌", "alphabet"] },
  { label: "MU", patterns: ["美光", "micron", " mu "] },
  { label: "SNDK", patterns: ["sndk", "sandisk", "闪迪"] },
  { label: "NVDA", patterns: ["nvda", "英伟达", "nvidia"] },
  { label: "TSLA", patterns: ["tsla", "特斯拉", "tesla"] },
  { label: "AAPL", patterns: ["$aapl", " aapl ", "苹果", "apple"] },
  { label: "MSFT", patterns: ["$msft", " msft ", "微软", "microsoft"] },
  { label: "META", patterns: ["$meta", " meta ", "meta platforms", "脸书", "facebook"] },
  { label: "AMZN", patterns: ["$amzn", " amzn ", "亚马逊", "amazon"] },
  { label: "AVGO", patterns: ["$avgo", " avgo ", "博通", "broadcom"] },
  { label: "AMD", patterns: ["$amd", " amd ", "超威", "advanced micro devices"] },
  { label: "TSM", patterns: ["$tsm", " tsm ", "台积电", "台積電", "tsmc"] },
  { label: "PLTR", patterns: ["$pltr", " pltr ", "palantir"] },
  { label: "MSTR", patterns: ["$mstr", " mstr ", "microstrategy", "strategy公司"] },
  { label: "COIN", patterns: ["$coin", " coinbase", "coinbase"] },
  { label: "NBIS", patterns: ["$nbis", " nbis ", "nebius"] },
  { label: "NFLX", patterns: ["$nflx", " nflx ", "奈飞", "netflix"] },
  { label: "ORCL", patterns: ["$orcl", " orcl ", "甲骨文", "oracle"] },
  { label: "CRWV", patterns: ["$crwv", " crwv ", "coreweave"] },
  { label: "SOL", patterns: ["$sol", " sol ", "solana"] },
  { label: "XRP", patterns: ["$xrp", " xrp ", "瑞波", "ripple"] },
  { label: "BNB", patterns: ["$bnb", " bnb ", "binance coin"] },
  { label: "DOGE", patterns: ["$doge", " doge ", "狗狗币", "dogecoin"] },
];

const BULLISH_WORDS = ["看涨", "偏多", "多头", "做多", "上涨", "上行", "反弹", "新高", "抄底", "买入", "低吸", "转强", "突破压力"] as const;
const BEARISH_WORDS = ["看跌", "偏空", "空头", "做空", "下跌", "下行", "回撤", "卖出", "减仓", "转弱", "跌破支撑", "破位"] as const;
const NEUTRAL_WORDS = ["震荡", "观望", "等待", "区间", "中性", "不追", "现金", "横盘"] as const;

function normalize(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").trim();
}

function countKeyword(text: string, keyword: string): number {
  if (!keyword) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    index = text.indexOf(keyword, index);
    if (index < 0) return count;
    count += 1;
    index += Math.max(1, keyword.length);
  }
}

export function classifyMultiViewTheory(rawText: string): TheoryReading[] {
  const text = rawText.toLowerCase();
  const explicitSchool = /^(?:缠论|江恩|gann|艾略特|elliott|六爻|奇门|八字|命理)$/i;
  const specificSchools = new Set<MultiViewTheory>(["缠论", "江恩", "艾略特波浪", "六爻", "奇门", "八字/命理"]);
  const scored = METHOD_RULES.map((rule) => {
    let explicitHits = 0;
    const score = rule.keywords.reduce((total, keyword) => {
      const hits = countKeyword(text, keyword.toLowerCase());
      const explicit = explicitSchool.test(keyword);
      if (explicit) explicitHits += hits;
      return total + hits * (explicit ? 4 : 1);
    }, 0);
    return { theory: rule.theory, score, explanation: rule.explanation, explicitHits };
  })
    .filter((item) => item.score > 0 && (!specificSchools.has(item.theory) || item.explicitHits > 0 || item.score >= 2))
    .map((item) => ({ theory: item.theory, score: item.score, explanation: item.explanation }) satisfies TheoryReading)
    .sort((a, b) => b.score - a.score || a.theory.localeCompare(b.theory, "zh-CN"));

  if (scored.length === 0) {
    return [
      {
        theory: "综合技术",
        score: 1,
        explanation: "当前摘要未出现足够鲜明的流派术语，暂按综合技术/市场判断归类，不强行贴流派标签。",
      },
    ];
  }
  return scored.slice(0, 3);
}

export function classifyMultiViewDirection(rawText: string): MultiViewDirection {
  const text = rawText.toLowerCase();
  const explicitBull = /看涨|看多|偏多|做多|多单|买入|低吸|bullish|long/.test(text);
  const explicitBear = /看跌|看空|偏空|做空|空单|卖出|减仓|bearish|short/.test(text);
  if (explicitBull && !explicitBear) return "BULLISH";
  if (explicitBear && !explicitBull) return "BEARISH";
  const bull = BULLISH_WORDS.reduce((score, word) => score + countKeyword(text, word), 0);
  const bear = BEARISH_WORDS.reduce((score, word) => score + countKeyword(text, word), 0);
  const neutral = NEUTRAL_WORDS.reduce((score, word) => score + countKeyword(text, word), 0);
  if (bull >= bear + 2 && bull > neutral) return "BULLISH";
  if (bear >= bull + 2 && bear > neutral) return "BEARISH";
  if (bull > bear && bull >= 2 && neutral === 0) return "BULLISH";
  if (bear > bull && bear >= 2 && neutral === 0) return "BEARISH";
  return "NEUTRAL";
}

export function classifyMultiViewHorizon(rawText: string): MultiViewHorizon {
  const text = rawText.toLowerCase();
  if (/未来\s*(?:3|三)\s*年|未来几年|长期|长线|半年|年度|全年|明年|2027|2028|季度|三个月/.test(text)) return "LONG";
  if (/本周|下周|未来\s*(?:1|一)[—\-~至到]?\s*(?:7|七)\s*天|中期|几周|未来一个月|本月|下月|8月|9月|10月/.test(text)) return "MEDIUM";
  if (/日内|今天|今日|明天|次日|短线|盘中|几小时|2[—\-~至到]?6小时|未来\s*(?:1|一)[—\-~至到]?\s*(?:3|三)\s*天/.test(text)) return "SHORT";
  return "UNSPECIFIED";
}

export function extractMultiViewAssets(rawText: string): string[] {
  const padded = ` ${rawText.toLowerCase()} `;
  const hits: string[] = [];
  for (const rule of ASSET_RULES) {
    if (rule.patterns.some((pattern) => padded.includes(pattern.toLowerCase()))) hits.push(rule.label);
  }
  return hits.slice(0, 5);
}

export function guessMultiViewIdentitySeed(rawText: string, hrefs: readonly string[] = []): string | null {
  for (const href of hrefs) {
    const match = href.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{2,30})/i);
    if (match?.[1] && !["home", "intent", "share", "search"].includes(match[1].toLowerCase())) return `@${match[1].toLowerCase()}`;
  }
  const handle = rawText.match(/@[A-Za-z0-9_]{2,30}/);
  if (handle?.[0]) return handle[0].toLowerCase();

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter(Boolean)
    .slice(0, 8);
  const labelled = lines.find((line) => /^(?:博主|作者|分析师|来源|source|author)\s*[:：]/i.test(line));
  if (labelled) return labelled.toLowerCase();
  return null;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function anonymizeMultiViewResearcher(identitySeed: string | null, fallbackIndex: number): string {
  const seed = normalize(identitySeed ?? `member-multi-view:${fallbackIndex}`).toLowerCase();
  const code = 1000 + (stableHash(seed) % 9000);
  return `研究者 ${code}`;
}

export function stripMultiViewIdentity(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const identityIndexes = new Set<number>();
  const firstNonEmpty = lines.findIndex((candidate) => Boolean(normalize(candidate)));
  if (firstNonEmpty >= 0) {
    const firstLine = normalize(lines[firstNonEmpty] ?? "");
    const looksLikeStandaloneIdentity =
      firstLine.length <= 42 &&
      !/\d/.test(firstLine) &&
      extractMultiViewAssets(firstLine).length === 0 &&
      !/看涨|看跌|偏多|偏空|多头|空头|上涨|下跌|震荡|支撑|压力|目标|失效|突破|跌破|回踩|财报|宏观|利率|周期[:：]|[。！？!?；;]/i.test(firstLine);
    // Alpha-feed cards commonly start with a display name even when the handle/link is absent.
    // Removing a short non-market heading here prevents accidental identity leakage; theory
    // classification still uses the unredacted in-memory text, so method detection is preserved.
    if (looksLikeStandaloneIdentity) identityIndexes.add(firstNonEmpty);
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = normalize(lines[index] ?? "");
    if (!line) continue;
    if (/@[A-Za-z0-9_]{2,30}/.test(line) || /(?:x\.com|twitter\.com)\//i.test(line)) {
      identityIndexes.add(index);
      if (index > 0 && normalize(lines[index - 1] ?? "").length <= 42) identityIndexes.add(index - 1);
    }
    if (/^(?:博主|作者|分析师|来源|source|author)\s*[:：]/i.test(line)) identityIndexes.add(index);
  }

  return lines
    .filter((_line, index) => !identityIndexes.has(index))
    .join("\n")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/@[A-Za-z0-9_]{2,30}/g, " ")
    .replace(/(?:x\.com|twitter\.com)\/\S+/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Final registry-aware redaction for member surfaces; handles may be bare, @-prefixed or embedded in prose. */
export function redactMultiViewSourceHandles(rawText: string, handles: readonly string[]): string {
  const patterns = handles
    .map((handle) => handle.replace(/^@+/, "").trim())
    .filter(Boolean)
    .map((handle) => handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!patterns.length) return rawText;
  const handlePattern = new RegExp(
    `(^|[^A-Za-z0-9_@])@?(?:${patterns.join("|")})(?=$|[^A-Za-z0-9_])`,
    "gi",
  );
  return rawText
    .replace(handlePattern, (_match, prefix: string) => prefix)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Prevent a monitored identity from being rendered as an asset/cashtag label. */
export function filterMultiViewSourceAssets(values: readonly string[], handles: readonly string[]): string[] {
  const blocked = new Set(handles.map((handle) => handle.replace(/^[@$]+/, "").replace(/[^A-Za-z0-9_]/g, "").toLowerCase()).filter(Boolean));
  return values.filter((value) => {
    const normalized = String(value).replace(/^[@$]+/, "").replace(/[^A-Za-z0-9_]/g, "").toLowerCase();
    return Boolean(normalized) && !blocked.has(normalized);
  });
}

const IMPORTANT_PATTERNS = [
  /看涨|看跌|偏多|偏空|多头|空头|上涨|下跌|反弹|回撤|震荡/,
  /支撑|压力|阻力|目标|止损|失效|突破|跌破|回踩|破位/,
  /财报|营收|毛利率|指引|估值|订单|基本面|供需|库存/,
  /美联储|利率|降息|加息|流动性|通胀|国债|美元|地缘|政策/,
  /缠论|中枢|背驰|江恩|波浪|周期|六爻|奇门|八字|命理/,
] as const;

function cleanSentence(sentence: string): string {
  return normalize(sentence)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@[A-Za-z0-9_]{2,30}/g, "")
    .replace(/^(?:博主|作者|分析师|来源|source|author)\s*[:：].*$/i, "")
    .replace(/^(?:点赞|订阅|关注|转发|评论).*/i, "")
    .trim();
}

function clampText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, Math.max(1, maxChars - 1)).replace(/[，,；;：:\s]+$/g, "");
  return `${clipped}…`;
}

export function summarizeMultiView(rawText: string, maxChars = 180): string {
  const cleaned = stripMultiViewIdentity(rawText);
  const pieces = cleaned
    .split(/(?<=[。！？!?；;])|\n+/)
    .map(cleanSentence)
    .filter((sentence) => sentence.length >= 8 && sentence.length <= 260)
    .filter((sentence) => !/^(?:大家好|欢迎|免责声明|仅供参考|不构成投资建议)/.test(sentence));

  const scored = pieces.map((sentence, index) => {
    const importance = IMPORTANT_PATTERNS.reduce((score, pattern) => score + (pattern.test(sentence) ? 2 : 0), 0);
    const assetBonus = extractMultiViewAssets(sentence).length > 0 ? 2 : 0;
    return { sentence, index, score: importance + assetBonus };
  });
  const chosen = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  const fallback = pieces.slice(0, 2);
  const result = (chosen.length ? chosen : fallback).join(" ");
  return clampText(result || "暂无足够结构化内容，等待下一轮扫描。", maxChars);
}

function cleanLevelValue(value: string): string {
  return normalize(value)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/@[A-Za-z0-9_]{2,30}/g, "")
    .replace(/[。；;].*$/g, "")
    .slice(0, 72)
    .trim();
}

export function extractMultiViewLevels(rawText: string): MultiViewLevel[] {
  const cleaned = stripMultiViewIdentity(rawText);
  const patterns: ReadonlyArray<{ label: MultiViewLevel["label"]; regex: RegExp }> = [
    { label: "支撑", regex: /(?:关键)?支撑(?:位|区|区域)?\s*[:：]?\s*([^\n。；;]{2,72})/i },
    { label: "压力", regex: /(?:关键)?(?:压力|阻力)(?:位|区|区域)?\s*[:：]?\s*([^\n。；;]{2,72})/i },
    { label: "目标", regex: /(?:目标|目标位|目标价)\s*[:：]?\s*([^\n。；;]{2,72})/i },
    { label: "失效", regex: /(?:失效|止损|破位位|无效位)\s*[:：]?\s*([^\n。；;]{2,72})/i },
  ];
  const levels: MultiViewLevel[] = [];
  for (const item of patterns) {
    const match = cleaned.match(item.regex);
    const value = cleanLevelValue(match?.[1] ?? "");
    if (value && /\d/.test(value)) levels.push({ label: item.label, value });
  }
  return levels;
}

export function buildMultiViewBrief(
  rawText: string,
  hrefs: readonly string[],
  fallbackIndex: number,
): MultiViewBrief {
  const identitySeed = guessMultiViewIdentitySeed(rawText, hrefs);
  return {
    researcherCode: anonymizeMultiViewResearcher(identitySeed, fallbackIndex),
    direction: classifyMultiViewDirection(rawText),
    horizon: classifyMultiViewHorizon(rawText),
    theories: classifyMultiViewTheory(rawText),
    assets: extractMultiViewAssets(rawText),
    summary: summarizeMultiView(rawText),
    levels: extractMultiViewLevels(rawText),
  };
}


// V7.20.10.7: explicit per-post time window / cashtag extraction for the member asset matrix.
export function extractMultiViewTimeWindows(rawText: string): string[] {
  const text = stripMultiViewIdentity(rawText);
  const values = new Set<string>();
  const patterns = [
    /20\d{2}[年\/.\-]\d{1,2}(?:[月\/.\-]\d{1,2}(?:日|号)?)?\s*(?:至|到|[-~—])\s*20?\d{0,2}[年\/.\-]?\d{1,2}[月\/.\-]\d{1,2}(?:日|号)?/g,
    /\d{1,2}月\d{1,2}(?:日|号)?\s*(?:至|到|[-~—])\s*(?:\d{1,2}月)?\d{1,2}(?:日|号)?/g,
    /\d{1,2}[\/.\-]\d{1,2}\s*(?:至|到|[-~—])\s*\d{1,2}[\/.\-]\d{1,2}/g,
    /20\d{2}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}(?:日|号)?/g,
    /\d{1,2}月\d{1,2}(?:日|号)/g,
    /\d{1,2}[\/.\-]\d{1,2}(?![\d\/.\-])/g,
    /(?:今天|今日|明天|明日|后天|下周[一二三四五六日天])/g,
    /(?:本周|下周|未来\s*\d{1,2}\s*(?:天|周|个月)|未来一周|未来两周|本月|下月|月底|月初|年底前|年内|中期选举前)/g,
    /(?:8|9|10|11|12)月(?:上旬|中旬|下旬|底|初)?/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = normalize(match[0] ?? "");
      if (value) values.add(value);
    }
  }
  return [...values].slice(0, 6);
}

function beijingDateKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function addDateDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return beijingDateKey(date.toISOString()) ?? dateKey;
}

function dateKeyFromMonthDay(month: number, day: number, postedDate: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const postedYear = Number(postedDate.slice(0, 4));
  const candidate = `${postedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${candidate}T12:00:00+08:00`);
  if (Number.isNaN(parsed.getTime()) || beijingDateKey(parsed.toISOString()) !== candidate) return null;
  const distanceDays = (parsed.getTime() - new Date(`${postedDate}T12:00:00+08:00`).getTime()) / 86_400_000;
  if (distanceDays < -180) return `${postedYear + 1}-${candidate.slice(5)}`;
  return candidate;
}

function addExpandedRange(target: Set<string>, start: string | null, end: string | null): void {
  if (!start || !end) return;
  const startAt = new Date(`${start}T12:00:00+08:00`).getTime();
  const endAt = new Date(`${end}T12:00:00+08:00`).getTime();
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt < startAt) return;
  const days = Math.round((endAt - startAt) / 86_400_000);
  if (days > 31) return;
  for (let offset = 0; offset <= days; offset += 1) target.add(addDateDays(start, offset));
}

/**
 * Resolve an opinion to exact Beijing calendar dates. Medium/long views without
 * an explicit day stay undated; short views may use the posting day. This keeps
 * broad cycle opinions out of a fabricated daily comparison.
 */
export function resolveMultiViewTargetDates(input: {
  postedAt: string;
  horizon: MultiViewHorizon;
  timeWindows?: readonly string[];
  summary?: string;
}): string[] {
  const postedDate = beijingDateKey(input.postedAt);
  if (!postedDate) return [];
  const text = [...(input.timeWindows ?? []), input.summary ?? ""].join(" ");
  const values = new Set<string>();

  for (const match of text.matchAll(/(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})(?:日|号)?\s*(?:至|到|[-~—])\s*(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})(?:日|号)?/g)) {
    addExpandedRange(
      values,
      `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`,
      `${match[4]}-${String(Number(match[5])).padStart(2, "0")}-${String(Number(match[6])).padStart(2, "0")}`,
    );
  }
  for (const match of text.matchAll(/(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})(?:日|号)?/g)) {
    const key = `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
    const parsed = new Date(`${key}T12:00:00+08:00`);
    if (!Number.isNaN(parsed.getTime()) && beijingDateKey(parsed.toISOString()) === key) values.add(key);
  }

  for (const match of text.matchAll(/(\d{1,2})月(\d{1,2})(?:日|号)?\s*(?:至|到|[-~—])\s*(?:(\d{1,2})月)?(\d{1,2})(?:日|号)?/g)) {
    const startMonth = Number(match[1]);
    addExpandedRange(
      values,
      dateKeyFromMonthDay(startMonth, Number(match[2]), postedDate),
      dateKeyFromMonthDay(Number(match[3] ?? startMonth), Number(match[4]), postedDate),
    );
  }
  for (const match of text.matchAll(/(\d{1,2})[\/.\-](\d{1,2})\s*(?:至|到|[-~—])\s*(\d{1,2})[\/.\-](\d{1,2})/g)) {
    addExpandedRange(
      values,
      dateKeyFromMonthDay(Number(match[1]), Number(match[2]), postedDate),
      dateKeyFromMonthDay(Number(match[3]), Number(match[4]), postedDate),
    );
  }
  for (const match of text.matchAll(/(\d{1,2})月(\d{1,2})(?:日|号)?/g)) {
    const key = dateKeyFromMonthDay(Number(match[1]), Number(match[2]), postedDate);
    if (key) values.add(key);
  }
  for (const match of text.matchAll(/(?<!\d)(\d{1,2})[\/.\-](\d{1,2})(?![\d\/.\-])/g)) {
    const key = dateKeyFromMonthDay(Number(match[1]), Number(match[2]), postedDate);
    if (key) values.add(key);
  }

  if (/(?:今天|今日)/.test(text)) values.add(postedDate);
  if (/(?:明天|明日)/.test(text)) values.add(addDateDays(postedDate, 1));
  if (/后天/.test(text)) values.add(addDateDays(postedDate, 2));
  const weekdayMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
  for (const match of text.matchAll(/下周([一二三四五六日天])/g)) {
    const posted = new Date(`${postedDate}T12:00:00+08:00`);
    const currentDay = posted.getUTCDay() || 7;
    values.add(addDateDays(postedDate, 7 - currentDay + (weekdayMap[match[1] ?? ""] ?? 1)));
  }

  if (!values.size && input.horizon === "SHORT") values.add(postedDate);
  return [...values].sort();
}

export function extractMultiViewCashtags(rawText: string): string[] {
  const values = new Set<string>();
  for (const match of rawText.matchAll(/\$([A-Za-z][A-Za-z0-9]{1,9})\b/g)) {
    const ticker = (match[1] ?? "").toUpperCase();
    if (ticker && !["USD", "USDT", "USDC"].includes(ticker)) values.add(ticker);
  }
  return [...values].slice(0, 12);
}

export function summarizeMultiViewForAsset(rawText: string, asset: string, maxChars = 240): string {
  const cleaned = stripMultiViewIdentity(rawText);
  const normalizedAsset = asset.toUpperCase().replace(/USDT$/, "");
  const assetRule = ASSET_RULES.find((rule) => rule.label === normalizedAsset);
  const needles = new Set<string>([
    normalizedAsset.toLowerCase(),
    `$${normalizedAsset.toLowerCase()}`,
    ...(assetRule?.patterns ?? []).map((value) => value.trim().toLowerCase()),
  ]);
  const pieces = cleaned
    .split(/(?<=[。！？!?；;])|\n+/)
    .map(cleanSentence)
    .filter((sentence) => sentence.length >= 6 && sentence.length <= 360);
  const ranked = pieces.map((sentence, index) => {
    const lower = sentence.toLowerCase();
    const assetHit = [...needles].some((needle) => needle && lower.includes(needle));
    const marketSignal = IMPORTANT_PATTERNS.reduce((score, pattern) => score + (pattern.test(sentence) ? 2 : 0), 0);
    return { sentence, index, score: (assetHit ? 8 : 0) + marketSignal };
  });
  const assetHits = ranked.filter((item) => item.score >= 8);
  const chosen = (assetHits.length ? assetHits : ranked.filter((item) => item.score > 0))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
  return clampText((chosen.length ? chosen : pieces.slice(0, 2).map((item) => item)).join(" ") || "暂无可归纳内容。", maxChars);
}
