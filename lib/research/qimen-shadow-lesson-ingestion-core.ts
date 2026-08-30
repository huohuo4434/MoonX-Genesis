import { createHash } from "node:crypto";
import { z } from "zod";

import {
  assessDirectionalPalaceReadiness,
  assessObjectYongshenReadiness,
  type QimenSchoolId,
} from "@/lib/forecasts/qimen-school-separation-core";
import type {
  QimenFormalForecastSnapshot,
  QimenShadowReadingInput,
} from "@/lib/research/qimen-shadow-capture-core";

export const QIMEN_LESSON_EXTRACTION_SCHEMA = "moox.qimen-lesson-extraction.v1" as const;

function isValidCalendarDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasValidCalendarDate(value: string): boolean {
  for (const match of value.matchAll(/(20\d{2})(?:[-/.年])(\d{1,2})(?:[-/.月])(\d{1,2})日?/g)) {
    if (isValidCalendarDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) return true;
  }
  return false;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  return isValidCalendarDateParts(year!, month!, day!);
}, "日期不是有效公历日");
const quote = z.string().min(4).max(800);
const sourceBlockQuote = z.string().min(20).max(6_000);
const heavenlyStem = z.enum(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const chartFactSchema = z.object({
  kind: z.enum(["CHART_TIME", "YIN_YANG_BUREAU", "DUTY_STAR", "DUTY_DOOR", "DAY_STEM", "HOUR_STEM", "PALACE_LAYOUT"]),
  value: z.string().trim().min(1).max(800),
  quote,
}).strict();
const common = z.object({
  marketCode: z.enum(["BTC", "ETH", "SOL", "HYPE"]),
  horizon: z.enum(["INTRADAY", "SWING", "POSITION"]),
  direction: z.enum(["UP", "DOWN", "SIDEWAYS"]),
  confidence: z.number().finite().min(0).max(100),
  applicableFrom: isoDate,
  applicableUntil: isoDate,
  chartComplete: z.boolean(),
  chartFacts: z.array(chartFactSchema).min(4).max(12),
  evidence: z.object({
    sourceBlockQuote,
    chartQuote: quote,
    assetQuote: quote,
    directionQuote: quote,
    windowQuote: quote,
  }).strict(),
});

const objectDraftSchema = common.extend({
  schoolId: z.literal("OBJECT_YONGSHEN"),
  primaryStems: z.array(heavenlyStem).min(1).max(4),
  secondaryStems: z.array(heavenlyStem).max(4).default([]),
  basis: z.enum(["TEACHER_EXPLICIT", "TEACHER_CASE"]),
  evidence: common.shape.evidence.extend({ stemsQuote: quote }).strict(),
}).strict();

const directionalDraftSchema = common.extend({
  schoolId: z.literal("DIRECTIONAL_PALACE"),
  question: z.string().trim().min(3).max(240),
  upPalace: z.number().int().min(1).max(9),
  downPalace: z.number().int().min(1).max(9),
  sidewaysPalace: z.number().int().min(1).max(9),
  evidence: common.shape.evidence.extend({
    questionQuote: quote,
    upPalaceQuote: quote,
    downPalaceQuote: quote,
    sidewaysPalaceQuote: quote,
  }).strict(),
}).strict();

export const qimenLessonModelResponseSchema = z.object({
  drafts: z.array(z.discriminatedUnion("schoolId", [objectDraftSchema, directionalDraftSchema])).max(12),
}).strict();

export type QimenLessonModelDraft = z.infer<typeof qimenLessonModelResponseSchema>["drafts"][number];

export type AcceptedQimenLessonDraft = QimenLessonModelDraft & {
  evidenceSha256: string;
  readiness: "RESEARCH_ONLY";
};

export type QimenLessonExtractionReport = {
  schemaVersion: typeof QIMEN_LESSON_EXTRACTION_SCHEMA;
  generatedAt: string;
  transcriptSha256: string;
  modelStatus: "EXTRACTED" | "NOT_APPLICABLE" | "MODEL_UNAVAILABLE" | "MODEL_FAILED" | "INVALID_MODEL_OUTPUT";
  accepted: AcceptedQimenLessonDraft[];
  rejected: Array<{ schoolId: QimenSchoolId | "UNKNOWN"; reason: string }>;
  policy: {
    researchOnly: true;
    mayChangeForecast: false;
    mayChangeWeights: false;
    mayTrade: false;
    missingChartFailsClosed: true;
    exactSourceQuotesRequired: true;
  };
};

export const qimenLessonExtractionReportSchema = z.object({
  schemaVersion: z.literal(QIMEN_LESSON_EXTRACTION_SCHEMA),
  generatedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  transcriptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  modelStatus: z.enum(["EXTRACTED", "NOT_APPLICABLE", "MODEL_UNAVAILABLE", "MODEL_FAILED", "INVALID_MODEL_OUTPUT"]),
  accepted: z.array(z.union([
    objectDraftSchema.extend({ evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/), readiness: z.literal("RESEARCH_ONLY") }),
    directionalDraftSchema.extend({ evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/), readiness: z.literal("RESEARCH_ONLY") }),
  ])).max(12),
  rejected: z.array(z.object({
    schoolId: z.enum(["OBJECT_YONGSHEN", "DIRECTIONAL_PALACE", "UNKNOWN"]),
    reason: z.string().min(1).max(400),
  }).strict()).max(24),
  policy: z.object({
    researchOnly: z.literal(true),
    mayChangeForecast: z.literal(false),
    mayChangeWeights: z.literal(false),
    mayTrade: z.literal(false),
    missingChartFailsClosed: z.literal(true),
    exactSourceQuotesRequired: z.literal(true),
  }).strict(),
}).strict();

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function qimenLessonTranscriptSha256(value: string): string {
  return sha256(value);
}

export function qimenLessonExistingReadingSignature(input: {
  sourceId: string;
  schoolId: AcceptedQimenLessonDraft["schoolId"];
  horizon: AcceptedQimenLessonDraft["horizon"];
  evidenceSha256: string;
}): string {
  return [input.sourceId, input.schoolId, input.horizon, input.evidenceSha256].join("|");
}

export function selectNovelQimenLessonCandidates<T extends { signature: string }>(input: {
  candidates: readonly T[];
  existingSignatures: ReadonlySet<string>;
  limit: number;
}): T[] {
  const take = Math.max(0, Math.trunc(input.limit));
  return input.candidates.filter((candidate) => !input.existingSignatures.has(candidate.signature)).slice(0, take);
}

export function rotateQimenLessonCandidates<T>(input: {
  candidates: readonly T[];
  serverNow: Date;
  bucketMs?: number;
  batchSize?: number;
}): T[] {
  if (!input.candidates.length) return [];
  const bucketMs = Math.max(60_000, Math.trunc(input.bucketMs ?? 5 * 60_000));
  const batchSize = Math.max(1, Math.trunc(input.batchSize ?? 12));
  const bucket = Math.floor(input.serverNow.getTime() / bucketMs);
  const offset = ((((bucket * batchSize) % input.candidates.length) + input.candidates.length) % input.candidates.length);
  return [...input.candidates.slice(offset), ...input.candidates.slice(0, offset)];
}

function quoteExists(transcript: string, value: string): boolean {
  return value.length >= 4 && transcript.includes(value);
}

const ASSET_TOKENS: Record<QimenLessonModelDraft["marketCode"], readonly string[]> = {
  BTC: ["BTC", "比特币", "Bitcoin", "bitcoin"],
  ETH: ["ETH", "以太坊", "Ethereum", "ethereum"],
  SOL: ["SOL", "Solana", "solana"],
  HYPE: ["HYPE", "Hyperliquid", "hyperliquid"],
};

const DIRECTION_TOKENS: Record<QimenLessonModelDraft["direction"], readonly string[]> = {
  UP: ["上涨", "上行", "走强", "看涨", "多头", "向上", "反弹"],
  DOWN: ["下跌", "下行", "走弱", "看跌", "空头", "向下", "回落"],
  SIDEWAYS: ["震荡", "横盘", "盘整", "区间"],
};

const NEGATION_TOKENS = /不是|并非|未提供|未给出|没有提供|不能|不可|不适用|错误|尚不明确|无法判断|不代表|不等于|拒绝|无望|难以|很难|不宜|避免/;
const UNCERTAINTY_TOKENS = /可能|也许|或许|未必|不一定|尚待确认|待确认|说不准|不确定/;
const CHART_NEGATION_TOKENS = /并非|不是|没有|未有|不存在|错误|示例|不代表实际|仅作演示|假设/;
const HYPOTHETICAL_TOKENS = /假设|假如|例如|比如|举例|仅作演示|不代表实际|条件推演|模拟情景|演示盘|示范/;
const UNSAFE_REPORTING_CONTEXT = /错误(?:观点|结论|窗口|时间|用神|宫位|结果|示例)?|反例|有人(?:说|认为|声称)|据说|传言|网传|仅作转述|只是转述|转述(?:内容|观点)?|不认同|不认可|不赞同|明确否定|被否定|仅作演示|只作演示|仅供示例|错误示范/;
const THIRD_PARTY_ATTRIBUTION = /(?:市场|外界|分析师|业内|机构|媒体|网友|他人|别人|某人|有人|大家|多数人|普遍共识|市场共识|消息人士|博主|专家|评论员|投资者)[^。！？!?\n]{0,16}(?:认为|觉得|判断|预测|说|表示|称|声称|观点|看好|看空)|(?:引用|摘录|转发|复述|转述|援引|转载)/;
const FIRST_PARTY_CONCLUSION = /^(?:(?:根据|结合)(?:本盘|这个盘)[，,：:]?)?(?:综合(?:判断|结论)|本盘(?:判断|显示|结论)|最终(?:判断|结论)|当前(?:判断|结论)|我的(?:判断|看法|结论)|我(?:认为|判断|看)|结论(?:是|为|：|:))/;
const CONDITIONAL_DIRECTION_CONTEXT = /如果|假如|假若|倘若|若(?:是)?|只要|一旦|除非|前提|条件|情况下|情形下|取决于|视(?:情况|行情|走势|结果)?[^。！？!?\n]{0,12}而定|以[^。！？!?\n]{0,30}为(?:前提|条件|基础)|(?:只有|必须|需要|等待|等到|待)[^。！？!?\n]{0,24}(?:才|之后|以后|后)|突破|站上|上破|跌破|失守|守住|企稳|确认|触及|达到|回踩|反抽/;
const DIRECTION_FAILURE_SUFFIX = /^[^。；;\n]{0,16}(?:失败|失效|结束|终结|不成立|被打破|被压制|被打爆|投降|无望|乏力|困难)/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asciiTokenPositions(value: string, token: string): number[] {
  const positions: number[] = [];
  const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(token)})(?=$|[^A-Za-z0-9])`, "gi");
  for (const match of value.matchAll(pattern)) {
    positions.push((match.index ?? 0) + match[1]!.length);
  }
  return positions;
}

function assetTokenPositions(value: string, asset: QimenLessonModelDraft["marketCode"]): number[] {
  const positions = new Set<number>();
  for (const token of ASSET_TOKENS[asset]) {
    if (/^[A-Za-z0-9]+$/.test(token)) {
      for (const position of asciiTokenPositions(value, token)) positions.add(position);
      continue;
    }
    let offset = value.indexOf(token);
    while (offset >= 0) {
      positions.add(offset);
      offset = value.indexOf(token, offset + token.length);
    }
  }
  return [...positions].sort((left, right) => left - right);
}

function containsAsset(value: string, asset: QimenLessonModelDraft["marketCode"]): boolean {
  return assetTokenPositions(value, asset).length > 0;
}

function hasControlledFirstPartyConclusion(value: string, asset: QimenLessonModelDraft["marketCode"]): boolean {
  const normalized = value.trim();
  const prefix = normalized.match(FIRST_PARTY_CONCLUSION)?.[0];
  if (!prefix) return false;
  const assetPosition = assetTokenPositions(normalized, asset)[0];
  if (assetPosition === undefined || assetPosition < prefix.length) return false;
  return /^[，,：:\s]*$/.test(normalized.slice(prefix.length, assetPosition));
}

function containsNegatedAsset(value: string, asset: QimenLessonModelDraft["marketCode"]): boolean {
  return assetTokenPositions(value, asset).some((offset) => {
    const before = value.slice(Math.max(0, offset - 8), offset);
    return /(?:并不|不是|不属于|不|未|非|没有|无法|不能|不可|拒绝|难以|很难|不宜|避免)\s*$/.test(before);
  });
}

function mentionedAssets(value: string): Set<QimenLessonModelDraft["marketCode"]> {
  const assets = new Set<QimenLessonModelDraft["marketCode"]>();
  for (const asset of Object.keys(ASSET_TOKENS) as Array<QimenLessonModelDraft["marketCode"]>) {
    if (containsAsset(value, asset)) assets.add(asset);
  }
  return assets;
}

function mentionsOnlyAsset(value: string, asset: QimenLessonModelDraft["marketCode"]): boolean {
  const assets = mentionedAssets(value);
  return assets.size === 1 && assets.has(asset);
}

function containsNegatedToken(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => {
    let offset = value.indexOf(token);
    while (offset >= 0) {
      const before = value.slice(Math.max(0, offset - 8), offset);
      const after = value.slice(offset + token.length, offset + token.length + 24);
      if (/(?:并不|不是|不属于|不|未|非|没有|无法|不能|不可|拒绝|难以|很难|不宜|避免)\s*$/.test(before) || DIRECTION_FAILURE_SUFFIX.test(after) || /^\s*(?:不适用|错误)/.test(after)) return true;
      offset = value.indexOf(token, offset + token.length);
    }
    return false;
  });
}

const PALACE_NUMBER: Record<string, number> = {
  "1": 1, 一: 1, 坎: 1, "2": 2, 二: 2, 坤: 2, "3": 3, 三: 3, 震: 3,
  "4": 4, 四: 4, 巽: 4, "5": 5, 五: 5, 中: 5, "6": 6, 六: 6, 乾: 6,
  "7": 7, 七: 7, 兑: 7, "8": 8, 八: 8, 艮: 8, "9": 9, 九: 9, 离: 9,
};

function palaceMatches(value: string): Array<{ palace: number; index: number }> {
  const matches: Array<{ palace: number; index: number }> = [];
  const pattern = /(?<![一二三四五六七八九十百千万0-9])(?:第)?([一二三四五六七八九123456789]|坎|坤|震|巽|中|乾|兑|艮|离)宫/g;
  for (const match of value.matchAll(pattern)) {
    const palace = PALACE_NUMBER[match[1]!];
    if (palace) matches.push({ palace, index: match.index ?? 0 });
  }
  return matches;
}

function quoteNamesOnlyPalace(value: string, expected: number): boolean {
  const palaces = new Set(palaceMatches(value).map((match) => match.palace));
  return palaces.size === 1 && palaces.has(expected);
}

const PALACE_DIRECTION_LABELS = {
  UP: ["上涨", "上行", "多头", "看涨"],
  DOWN: ["下跌", "下行", "空头", "看跌"],
  SIDEWAYS: ["震荡", "横盘", "盘整", "区间"],
} as const;

const PALACE_ROLE_PATTERNS = {
  UP: /(?:上涨|上行|多头|看涨)(?:方向)?(?:宫|(?:对应|位于|落在|取|为|是|在)?\s*(?:第)?[一二三四五六七八九123456789]\s*宫)/g,
  DOWN: /(?:下跌|下行|空头|看跌)(?:方向)?(?:宫|(?:对应|位于|落在|取|为|是|在)?\s*(?:第)?[一二三四五六七八九123456789]\s*宫)/g,
  SIDEWAYS: /(?:震荡|横盘|盘整|区间)(?:方向)?(?:宫|(?:对应|位于|落在|取|为|是|在)?\s*(?:第)?[一二三四五六七八九123456789]\s*宫)/g,
} as const;

function palaceRoleCount(value: string, expected: keyof typeof PALACE_ROLE_PATTERNS): number {
  return [...value.matchAll(PALACE_ROLE_PATTERNS[expected])].length;
}

function palaceQuoteMatches(value: string, expected: keyof typeof PALACE_DIRECTION_LABELS): boolean {
  if (palaceRoleCount(value, expected) !== 1) return false;
  if (NEGATION_TOKENS.test(value) || UNCERTAINTY_TOKENS.test(value)) return false;
  return (Object.keys(PALACE_DIRECTION_LABELS) as Array<keyof typeof PALACE_DIRECTION_LABELS>)
    .filter((label) => label !== expected)
    .every((label) => palaceRoleCount(value, label) === 0);
}

function containsAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function hasAffirmativeToken(value: string, token: string): boolean {
  let offset = value.indexOf(token);
  while (offset >= 0) {
    const before = value.slice(Math.max(0, offset - 8), offset);
    const after = value.slice(offset + token.length, offset + token.length + 24);
    const negatedBefore = /(?:并不|不是|不属于|不|未|非|没有|无法|不能|不可|拒绝|难以|很难|不宜|避免)\s*$/.test(before);
    if (!negatedBefore && !DIRECTION_FAILURE_SUFFIX.test(after) && !UNCERTAINTY_TOKENS.test(`${before}${token}${after}`)) return true;
    offset = value.indexOf(token, offset + token.length);
  }
  return false;
}

function affirmativeDirectionClasses(value: string): Set<QimenLessonModelDraft["direction"]> {
  const classes = new Set<QimenLessonModelDraft["direction"]>();
  for (const direction of Object.keys(DIRECTION_TOKENS) as Array<QimenLessonModelDraft["direction"]>) {
    if (DIRECTION_TOKENS[direction].some((token) => hasAffirmativeToken(value, token))) classes.add(direction);
  }
  return classes;
}

function hasAffirmativeDirection(value: string, direction: QimenLessonModelDraft["direction"]): boolean {
  const classes = affirmativeDirectionClasses(value);
  return classes.size === 1 && classes.has(direction);
}

function allEvidenceQuotes(draft: QimenLessonModelDraft): string[] {
  return [...Object.values(draft.evidence), ...draft.chartFacts.map((fact) => fact.quote)];
}

function decisiveEvidenceQuotes(draft: QimenLessonModelDraft): string[] {
  const common = [draft.evidence.assetQuote, draft.evidence.directionQuote, draft.evidence.windowQuote];
  return draft.schoolId === "OBJECT_YONGSHEN"
    ? [...common, draft.evidence.stemsQuote]
    : [...common, draft.evidence.questionQuote, draft.evidence.upPalaceQuote, draft.evidence.downPalaceQuote, draft.evidence.sidewaysPalaceQuote];
}

function isSentenceBoundary(char: string): boolean {
  return /[。！？!?\n]/.test(char);
}

function wholeSemanticUnit(sourceBlock: string, quoteValue: string): string | null {
  const first = sourceBlock.indexOf(quoteValue);
  if (first < 0 || sourceBlock.lastIndexOf(quoteValue) !== first) return null;
  let start = first;
  while (start > 0 && !isSentenceBoundary(sourceBlock[start - 1]!)) start -= 1;
  let end = first + quoteValue.length;
  while (end < sourceBlock.length && !isSentenceBoundary(sourceBlock[end]!)) end += 1;
  if (end < sourceBlock.length) end += 1;
  const unit = sourceBlock.slice(start, end).trim();
  return unit === quoteValue.trim() ? unit : null;
}

function hasExplicitChartTime(value: string): boolean {
  const date = /(?:20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)/;
  const time = /(?:[01]?\d|2[0-3])(?::\d{2}|时)|[甲乙丙丁戊己庚辛壬癸]?[子丑寅卯辰巳午未申酉戌亥]时/;
  return date.test(value) && hasValidCalendarDate(value) && time.test(value);
}

function chartTimeSignatures(value: string): Set<string> {
  const signatures = new Set<string>();
  const pattern = /20\d{2}(?:[-/.]\d{1,2}[-/.]\d{1,2}|年\d{1,2}月\d{1,2}日?)\s*(?:(?:[01]?\d|2[0-3])(?::\d{2}|时)|[甲乙丙丁戊己庚辛壬癸]?[子丑寅卯辰巳午未申酉戌亥]时)/g;
  for (const match of value.matchAll(pattern)) {
    if (hasValidCalendarDate(match[0])) signatures.add(match[0].replace(/\s+/g, ""));
  }
  return signatures;
}

function bureauSignatures(value: string): Set<string> {
  return new Set([...value.matchAll(/[阴陰阳陽]遁\s*[一二三四五六七八九123456789]\s*局/g)].map((match) => match[0].replace(/\s+/g, "")));
}

function hasExplicitBureau(value: string): boolean {
  return /[阴陰阳陽]遁\s*[一二三四五六七八九123456789]\s*局/.test(value);
}

function hasPrefixedValue(quoteValue: string, prefix: "值符" | "值使", factValue: string): boolean {
  const index = quoteValue.indexOf(prefix);
  const valueIndex = quoteValue.indexOf(factValue, Math.max(0, index));
  return index >= 0 && valueIndex > index && valueIndex - index <= 12;
}

function hasStructuredPalaceLayout(value: string): boolean {
  const structured = new Set<number>();
  const matches = palaceMatches(value);
  const occurrences = new Map<number, number>();
  for (const [index, match] of matches.entries()) {
    const palace = match.palace;
    occurrences.set(palace, (occurrences.get(palace) ?? 0) + 1);
    const nextPalaceIndex = matches[index + 1]?.index ?? value.length;
    const segment = value.slice(match.index, nextPalaceIndex).split(/[，。；;\n]/)[0] ?? "";
    if (CHART_NEGATION_TOKENS.test(segment)) continue;
    const hasHeavenStem = /天盘[甲乙丙丁戊己庚辛壬癸]/.test(segment);
    const hasEarthStem = /地盘[甲乙丙丁戊己庚辛壬癸]/.test(segment);
    const hasDoor = /开门|休门|生门|伤门|杜门|景门|死门|惊门/.test(segment);
    const hasStar = /天蓬|天芮|天冲|天辅|天禽|天心|天柱|天任|天英/.test(segment);
    const hasDeity = /值符|螣蛇|腾蛇|太阴|六合|白虎|玄武|九地|九天/.test(segment);
    if (palace && hasHeavenStem && hasEarthStem && hasDoor && hasStar && hasDeity) structured.add(palace);
  }
  return structured.size === 9 && occurrences.size === 9 && [...occurrences.values()].every((count) => count === 1);
}

function chartFactHasSemanticEvidence(fact: QimenLessonModelDraft["chartFacts"][number]): boolean {
  if (!fact.quote.includes(fact.value)) return false;
  if (CHART_NEGATION_TOKENS.test(fact.quote) || CHART_NEGATION_TOKENS.test(fact.value)) return false;
  switch (fact.kind) {
    case "CHART_TIME": return hasExplicitChartTime(fact.value) && hasExplicitChartTime(fact.quote);
    case "YIN_YANG_BUREAU": return hasExplicitBureau(fact.value) && hasExplicitBureau(fact.quote);
    case "DUTY_STAR": return hasPrefixedValue(fact.quote, "值符", fact.value);
    case "DUTY_DOOR": return hasPrefixedValue(fact.quote, "值使", fact.value);
    case "PALACE_LAYOUT": return hasStructuredPalaceLayout(fact.value) && hasStructuredPalaceLayout(fact.quote);
    case "DAY_STEM": return /(?:日干|日柱|日元|日辰)/.test(fact.quote);
    case "HOUR_STEM": return /(?:时干|时柱|时辰)/.test(fact.quote);
  }
}

function windowMentionsDate(value: string, date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return false;
  const fullPatterns = [
    /(?<!\d)(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g,
    /(?<!\d)(20\d{2})年(\d{1,2})月(\d{1,2})日?(?!\d)/g,
  ];
  for (const pattern of fullPatterns) {
    for (const match of value.matchAll(pattern)) {
      if (Number(match[1]) === year && Number(match[2]) === month && Number(match[3]) === day) return true;
    }
  }
  const shortPatterns = [
    /(?<![\d/])(\d{1,2})\/(\d{1,2})(?!\d)/g,
    /(?<!\d)(\d{1,2})月(\d{1,2})日?(?!\d)/g,
  ];
  for (const pattern of shortPatterns) {
    for (const match of value.matchAll(pattern)) {
      if (Number(match[1]) === month && Number(match[2]) === day) return true;
    }
  }
  return false;
}

function quoteAssignsStemRole(value: string, role: "PRIMARY" | "SECONDARY", stem: string): boolean {
  const rolePattern = /(?:产品)?(主用神|主要用神|主神|辅助用神|辅用神|辅神)/g;
  const matches = [...value.matchAll(rolePattern)];
  for (const [index, match] of matches.entries()) {
    const label = match[1] ?? "";
    const primary = /主用神|主要用神|主神/.test(label);
    if ((role === "PRIMARY") !== primary) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? value.length;
    const segment = value.slice(start, end).split(/[，,。；;\n]/)[0] ?? "";
    if (new RegExp(`(?:为|是|取|用|：|:|\\s){0,6}${escapeRegExp(stem)}(?:$|[^甲乙丙丁戊己庚辛壬癸])`).test(segment)) return true;
  }
  return false;
}

function matchCount(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

function dateMentionKeys(value: string): Set<string> {
  const keys = new Set<string>();
  for (const match of value.matchAll(/(?<!\d)(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g)) {
    keys.add(`${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`);
    keys.add(`${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`);
  }
  for (const match of value.matchAll(/(?<!\d)(20\d{2})年(\d{1,2})月(\d{1,2})日?(?!\d)/g)) {
    keys.add(`${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`);
    keys.add(`${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`);
  }
  for (const match of value.matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})(?!\d)/g)) {
    keys.add(`${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`);
  }
  for (const match of value.matchAll(/(?<!\d)(\d{1,2})月(\d{1,2})日?(?!\d)/g)) {
    keys.add(`${String(Number(match[1])).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`);
  }
  return keys;
}

function containsUnselectedDates(sourceBlock: string, selectedQuotes: string[]): boolean {
  const allowed = new Set(selectedQuotes.flatMap((quote) => [...dateMentionKeys(quote)]));
  return [...dateMentionKeys(sourceBlock)].some((key) => !allowed.has(key));
}

function questionGroupCount(value: string): number {
  return matchCount(value, /问题/g) + matchCount(value, /(?:再|另|接着|然后)\s*看/g);
}

function assetDirectionSegmentCount(value: string, marketCode: QimenLessonModelDraft["marketCode"]): number {
  return value
    .split(/[。；;\n]/)
    .filter((segment) => containsAsset(segment, marketCode)
      && (Object.values(DIRECTION_TOKENS) as ReadonlyArray<readonly string[]>).some((tokens) => containsAny(segment, tokens)))
    .length;
}

const HORIZON_TOKENS: Record<QimenLessonModelDraft["horizon"], readonly string[]> = {
  INTRADAY: ["日内", "当天", "当日", "超短", "短线"],
  SWING: ["本周", "下周", "周线", "周走势", "波段", "中线"],
  POSITION: ["本月", "下月", "月线", "月走势", "长线", "持仓周期"],
};

function quoteExplicitlyMatchesHorizon(value: string, expected: QimenLessonModelDraft["horizon"]): boolean {
  const matched = (Object.keys(HORIZON_TOKENS) as Array<QimenLessonModelDraft["horizon"]>)
    .filter((horizon) => containsAny(value, HORIZON_TOKENS[horizon]));
  return matched.length === 1 && matched[0] === expected;
}

function directionalQuotesBoundToQuestion(
  sourceBlock: string,
  draft: Extract<QimenLessonModelDraft, { schoolId: "DIRECTIONAL_PALACE" }>,
): boolean {
  const questionIndex = sourceBlock.indexOf(draft.evidence.questionQuote);
  if (questionIndex < 0) return false;
  const questionEnd = questionIndex + draft.evidence.questionQuote.length;
  const palaceQuotes = [draft.evidence.upPalaceQuote, draft.evidence.downPalaceQuote, draft.evidence.sidewaysPalaceQuote];
  const palacePositions = palaceQuotes.map((quoteValue) => sourceBlock.indexOf(quoteValue, questionEnd));
  if (palacePositions.some((position) => position < questionEnd)) return false;
  const groupEnd = Math.max(...palacePositions.map((position, index) => position + palaceQuotes[index]!.length));
  const bridge = sourceBlock.slice(questionEnd, groupEnd);
  if (containsAsset(bridge, draft.marketCode)) return false;
  if (/(?:再|另|接着|然后)\s*看|(?:日内|超短|短线|中线|长线|周线|月线|本周|下周|本月|下月)\s*(?:走势|方向|问题|怎么看)?/.test(bridge)) return false;
  return groupEnd - questionIndex <= 1_200;
}

function validateDraft(transcript: string, draft: QimenLessonModelDraft): string[] {
  const reasons: string[] = [];
  const quotePositions: number[] = [];
  for (const evidenceQuote of allEvidenceQuotes(draft)) {
    if (!quoteExists(transcript, evidenceQuote)) {
      reasons.push("证据引文不是原始转写中的连续原文。");
      break;
    }
    quotePositions.push(transcript.indexOf(evidenceQuote));
  }
  const sourceBlock = draft.evidence.sourceBlockQuote;
  const childQuotes = [
    ...Object.entries(draft.evidence).filter(([key]) => key !== "sourceBlockQuote").map(([, value]) => value),
    ...draft.chartFacts.map((fact) => fact.quote),
  ];
  if (childQuotes.some((value) => !sourceBlock.includes(value))) reasons.push("盘、标的、方向、时间窗与流派字段不是同一段连续原文，禁止跨段拼接。");
  const decisiveUnits = decisiveEvidenceQuotes(draft).map((quoteValue) => wholeSemanticUnit(sourceBlock, quoteValue));
  if (decisiveUnits.some((unit) => unit === null)) reasons.push("决定性引文必须覆盖唯一的完整语义句，禁止截掉前导限定或后续反驳。");
  if (UNSAFE_REPORTING_CONTEXT.test(sourceBlock)
    || decisiveUnits.some((unit) => unit !== null && UNSAFE_REPORTING_CONTEXT.test(unit))) reasons.push("证据上下文包含错误、反例、转述后否认或演示语境，不能登记为前瞻读数。");
  if (chartTimeSignatures(sourceBlock).size !== 1 || bureauSignatures(sourceBlock).size !== 1) reasons.push("同一证据块包含多个或缺失唯一奇门盘签名，禁止跨盘拼接。");
  if (CHART_NEGATION_TOKENS.test(draft.evidence.chartQuote)) reasons.push("盘面原文包含否定、错误示例或假设表述。");
  if (HYPOTHETICAL_TOKENS.test(sourceBlock) || childQuotes.some((value) => HYPOTHETICAL_TOKENS.test(value))) reasons.push("证据块或其子引文包含假设/示例表述，不能作为真实前瞻读数。");
  if (/未提供|没有提供|未给出|缺少|缺失|不完整(?:的)?(?:奇门)?盘|不是完整(?:的)?(?:奇门)?盘/.test(sourceBlock)) reasons.push("原文明确否认或缺失完整奇门盘。");
  if (!draft.chartComplete) reasons.push("模型未标记完整奇门盘。");
  if (new Set(draft.chartFacts.map((fact) => fact.kind)).size !== draft.chartFacts.length) reasons.push("盘面字段类型重复，不能重复凑足完整盘。");
  const factKinds = new Set(draft.chartFacts.map((fact) => fact.kind));
  if (!factKinds.has("CHART_TIME") || !factKinds.has("YIN_YANG_BUREAU")) reasons.push("完整盘缺少起局时间或阴阳遁局数证据。");
  if (!factKinds.has("PALACE_LAYOUT")) reasons.push("自动采集必须包含可验证的多宫结构，值符值使不能替代完整盘。");
  if (draft.chartFacts.some((fact) => !chartFactHasSemanticEvidence(fact))) reasons.push("盘面字段不是可验证的起局时间、阴阳遁局数、值符值使或结构化宫位原文。");
  if (!containsAsset(draft.evidence.assetQuote, draft.marketCode)) reasons.push("资产代码没有对应的原文证据。");
  if (!containsAny(draft.evidence.directionQuote, DIRECTION_TOKENS[draft.direction])) reasons.push("方向结论没有对应的原文证据。");
  if (!hasControlledFirstPartyConclusion(draft.evidence.directionQuote, draft.marketCode)
    || THIRD_PARTY_ATTRIBUTION.test(draft.evidence.directionQuote)) reasons.push("方向原文没有明确归属于讲述者、本盘或当前综合结论，第三方观点不得自动登记。");
  if (CONDITIONAL_DIRECTION_CONTEXT.test(draft.evidence.directionQuote)) reasons.push("方向原文包含尚未验证的条件触发结构，不能登记为无条件确定方向。");
  if (!hasAffirmativeDirection(draft.evidence.directionQuote, draft.direction)) reasons.push("方向原文没有受控肯定句式，或明确写明该方向失败/失效。");
  if (!containsAsset(draft.evidence.directionQuote, draft.marketCode)) reasons.push("方向原文没有同时指向所选资产。");
  if (!containsAsset(draft.evidence.windowQuote, draft.marketCode)) reasons.push("适用窗口原文没有同时指向所选资产。");
  if (![draft.evidence.assetQuote, draft.evidence.directionQuote, draft.evidence.windowQuote].every((value) => mentionsOnlyAsset(value, draft.marketCode))) reasons.push("资产、方向或适用窗口原文同时涉及其他支持资产，自动归属存在歧义。");
  if ([draft.evidence.assetQuote, draft.evidence.directionQuote, draft.evidence.windowQuote].some((value) => NEGATION_TOKENS.test(value))) reasons.push("资产、方向或适用窗口原文包含否定/不确定表述，不能自动转成肯定读数。");
  if ([draft.evidence.directionQuote, draft.evidence.windowQuote].some((value) => UNCERTAINTY_TOKENS.test(value))) reasons.push("方向或适用窗口原文包含可能性措辞，不能自动转成确定读数。");
  if (containsNegatedAsset(draft.evidence.assetQuote, draft.marketCode) || containsNegatedToken(draft.evidence.directionQuote, DIRECTION_TOKENS[draft.direction])) reasons.push("资产或方向关键词在原文中被否定，不能自动转成肯定读数。");
  const directionClasses = affirmativeDirectionClasses(draft.evidence.directionQuote);
  if (directionClasses.size !== 1 || !directionClasses.has(draft.direction)) reasons.push("方向原文包含零个或多个有效方向类别，不能压缩成单一奇门方向。");
  const mentionedDirectionClasses = new Set((Object.keys(DIRECTION_TOKENS) as Array<QimenLessonModelDraft["direction"]>)
    .filter((direction) => containsAny(draft.evidence.directionQuote, DIRECTION_TOKENS[direction])));
  if (mentionedDirectionClasses.size !== 1 || !mentionedDirectionClasses.has(draft.direction)) reasons.push("方向原文提到多个方向或路径阶段，不能压缩成单一奇门方向。");
  if (draft.applicableFrom > draft.applicableUntil) reasons.push("适用时间窗起止颠倒。");
  if (!windowMentionsDate(draft.evidence.windowQuote, draft.applicableFrom)
    || !windowMentionsDate(draft.evidence.windowQuote, draft.applicableUntil)) reasons.push("适用日期没有完整出现在原文时间窗证据中。");
  if (matchCount(sourceBlock, /(?:适用时间|适用窗口|有效期)/g) !== 1
    || containsUnselectedDates(sourceBlock, [draft.evidence.chartQuote, draft.evidence.windowQuote])) reasons.push("证据块包含多个或未选中的日期窗口，禁止把旧盘调度到其他周期。");
  if (assetDirectionSegmentCount(sourceBlock, draft.marketCode) !== 1) reasons.push("证据块必须且只能包含一条对应资产的方向结论，禁止跨问题拼接。");
  if (draft.schoolId === "OBJECT_YONGSHEN") {
    if (matchCount(sourceBlock, /(?:产品)?(?:主用神|主要用神|主神)/g) !== 1
      || matchCount(sourceBlock, /(?:产品)?(?:辅助用神|辅用神|辅神)/g) !== 1
      || matchCount(sourceBlock, /(?:适用时间|适用窗口|有效期)/g) !== 1
      || questionGroupCount(sourceBlock) > 1) reasons.push("对象用神证据块包含多个问题、用神组或适用窗口，禁止跨问题拼接。");
    if (draft.primaryStems.some((stem) => !quoteAssignsStemRole(draft.evidence.stemsQuote, "PRIMARY", stem))) reasons.push("产品主用神没有逐项以主用神角色出现在原文证据中。");
    if (draft.secondaryStems.some((stem) => !quoteAssignsStemRole(draft.evidence.stemsQuote, "SECONDARY", stem))) reasons.push("产品辅助用神没有逐项以辅助用神角色出现在原文证据中。");
    if (new Set(draft.primaryStems).size !== draft.primaryStems.length || new Set(draft.secondaryStems).size !== draft.secondaryStems.length) reasons.push("主用神或辅助用神存在重复天干。");
    if (draft.primaryStems.some((stem) => draft.secondaryStems.includes(stem))) reasons.push("主用神与辅助用神不能使用同一天干。");
    if (!containsAsset(draft.evidence.stemsQuote, draft.marketCode)) reasons.push("产品用神原文没有同时指向所选资产。");
    if (!mentionsOnlyAsset(draft.evidence.stemsQuote, draft.marketCode)) reasons.push("产品用神原文同时涉及其他支持资产，归属不唯一。");
    if (NEGATION_TOKENS.test(draft.evidence.stemsQuote)) reasons.push("产品用神原文包含否定或不确定表述。");
    if (containsNegatedToken(draft.evidence.stemsQuote, [...draft.primaryStems, ...draft.secondaryStems])) reasons.push("产品主用神或辅助用神关键词在原文中被否定。");
    const readiness = assessObjectYongshenReadiness({
      chartComplete: draft.chartComplete,
      objectInput: {
        asset: draft.marketCode,
        primaryStems: draft.primaryStems,
        secondaryStems: draft.secondaryStems,
        basis: draft.basis,
        sourceId: "LESSON_SOURCE_PENDING",
      },
    });
    reasons.push(...readiness.reasons.filter(() => readiness.readiness === "UNAVAILABLE"));
  } else {
    if (questionGroupCount(sourceBlock) !== 1
      || palaceRoleCount(sourceBlock, "UP") !== 1
      || palaceRoleCount(sourceBlock, "DOWN") !== 1
      || palaceRoleCount(sourceBlock, "SIDEWAYS") !== 1) reasons.push("定向取宫证据块必须且只能包含一个问题和一组三结果宫。");
    if (!directionalQuotesBoundToQuestion(sourceBlock, draft)) reasons.push("三结果宫没有与同一个问题段连续绑定，禁止跨问题拼接。");
    if (![draft.evidence.questionQuote, draft.evidence.directionQuote, draft.evidence.windowQuote]
      .every((quoteValue) => quoteExplicitlyMatchesHorizon(quoteValue, draft.horizon))) reasons.push("问题、方向和适用窗口没有逐项写明同一观察周期，禁止跨周期拼接。");
    const palaces = [draft.upPalace, draft.downPalace, draft.sidewaysPalace];
    if (new Set(palaces).size !== 3) reasons.push("上涨、下跌、震荡三宫存在重复。");
    if (!quoteNamesOnlyPalace(draft.evidence.upPalaceQuote, draft.upPalace)) reasons.push("上涨宫没有唯一且严格对应的原文宫位证据。");
    if (!quoteNamesOnlyPalace(draft.evidence.downPalaceQuote, draft.downPalace)) reasons.push("下跌宫没有唯一且严格对应的原文宫位证据。");
    if (!quoteNamesOnlyPalace(draft.evidence.sidewaysPalaceQuote, draft.sidewaysPalace)) reasons.push("震荡宫没有唯一且严格对应的原文宫位证据。");
    if (!palaceQuoteMatches(draft.evidence.upPalaceQuote, "UP")) reasons.push("上涨宫原文没有唯一明确的上涨标签。");
    if (!palaceQuoteMatches(draft.evidence.downPalaceQuote, "DOWN")) reasons.push("下跌宫原文没有唯一明确的下跌标签。");
    if (!palaceQuoteMatches(draft.evidence.sidewaysPalaceQuote, "SIDEWAYS")) reasons.push("震荡宫原文没有唯一明确的震荡标签。");
    if (!draft.evidence.questionQuote.includes(draft.question) || !containsAsset(draft.evidence.questionQuote, draft.marketCode)) reasons.push("定向取宫问题原文没有同时包含所选问题和资产。");
    if (!mentionsOnlyAsset(draft.evidence.questionQuote, draft.marketCode)) reasons.push("定向取宫问题原文同时涉及其他支持资产，归属不唯一。");
    if ([draft.evidence.questionQuote, draft.evidence.upPalaceQuote, draft.evidence.downPalaceQuote, draft.evidence.sidewaysPalaceQuote].some((value) => NEGATION_TOKENS.test(value))) reasons.push("问题或三结果宫原文包含否定/不确定表述。");
    const readiness = assessDirectionalPalaceReadiness({
      chartComplete: draft.chartComplete,
      directionalInput: {
        chartId: "LESSON_CHART_PENDING",
        sourceId: "LESSON_SOURCE_PENDING",
        question: draft.question,
        upPalace: draft.upPalace,
        downPalace: draft.downPalace,
        sidewaysPalace: draft.sidewaysPalace,
        recordedBeforeOutcome: true,
      },
    });
    reasons.push(...readiness.reasons.filter(() => readiness.readiness === "UNAVAILABLE"));
  }
  return [...new Set(reasons)];
}

export function buildQimenLessonExtractionReport(input: {
  transcript: string;
  generatedAt: string;
  modelStatus: QimenLessonExtractionReport["modelStatus"];
  modelOutput?: unknown;
}): QimenLessonExtractionReport {
  const transcriptSha256 = qimenLessonTranscriptSha256(input.transcript);
  const accepted: AcceptedQimenLessonDraft[] = [];
  const rejected: QimenLessonExtractionReport["rejected"] = [];
  const parsed = qimenLessonModelResponseSchema.safeParse(input.modelOutput ?? { drafts: [] });
  const status = input.modelStatus === "EXTRACTED" && !parsed.success ? "INVALID_MODEL_OUTPUT" : input.modelStatus;
  if (parsed.success) {
    for (const draft of parsed.data.drafts) {
      const reasons = validateDraft(input.transcript, draft);
      if (reasons.length) {
        rejected.push({ schoolId: draft.schoolId, reason: reasons.join("；").slice(0, 400) });
        continue;
      }
      accepted.push({
        ...draft,
        confidence: Math.min(70, Math.round(draft.confidence)),
        readiness: "RESEARCH_ONLY",
        evidenceSha256: sha256(canonicalJson({ transcriptSha256, draft })),
      });
    }
  } else if (input.modelStatus === "EXTRACTED") {
    rejected.push({ schoolId: "UNKNOWN", reason: "模型输出结构无效，未生成任何奇门读数。" });
  }
  return {
    schemaVersion: QIMEN_LESSON_EXTRACTION_SCHEMA,
    generatedAt: input.generatedAt,
    transcriptSha256,
    modelStatus: status,
    accepted,
    rejected,
    policy: {
      researchOnly: true,
      mayChangeForecast: false,
      mayChangeWeights: false,
      mayTrade: false,
      missingChartFailsClosed: true,
      exactSourceQuotesRequired: true,
    },
  };
}

export type PlannedQimenLessonReading = {
  reading: QimenShadowReadingInput;
  formal: QimenFormalForecastSnapshot;
};

export function qimenLessonDecisionAt(generatedAt: string, applicableFrom?: string): Date {
  const generated = new Date(generatedAt);
  if (!Number.isFinite(generated.getTime())) throw new Error("课程提取时间无效。");
  const next = new Date(Math.ceil(generated.getTime() / 3_600_000) * 3_600_000);
  if (next.getTime() - generated.getTime() < 35 * 60_000) next.setTime(next.getTime() + 3_600_000);
  if (applicableFrom) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(applicableFrom)) throw new Error("课程适用起始日期无效。");
    const windowStart = new Date(`${applicableFrom}T00:00:00.000+08:00`);
    if (!Number.isFinite(windowStart.getTime())) throw new Error("课程适用起始日期无效。");
    if (windowStart.getTime() > next.getTime()) next.setTime(windowStart.getTime());
  }
  return next;
}

function horizonHours(horizon: AcceptedQimenLessonDraft["horizon"]): number {
  return horizon === "INTRADAY" ? 8 : horizon === "SWING" ? 24 : 72;
}

function dateAtHongKong(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}

function deterministicId(prefix: string, value: unknown): string {
  return `${prefix}-${sha256(canonicalJson(value)).slice(0, 32)}`;
}

export function planQimenLessonReading(input: {
  lessonId: string;
  sourceVersion: string;
  sourceTranscriptSha256: string;
  sourceReportSha256: string;
  reportGeneratedAt: string;
  draft: AcceptedQimenLessonDraft;
  formal: QimenFormalForecastSnapshot;
}): PlannedQimenLessonReading {
  const decisionAt = qimenLessonDecisionAt(input.reportGeneratedAt, input.draft.applicableFrom);
  const evaluationDueAt = new Date(decisionAt.getTime() + horizonHours(input.draft.horizon) * 3_600_000);
  const decisionDate = dateAtHongKong(decisionAt);
  const dueDate = dateAtHongKong(evaluationDueAt);
  if (decisionDate < input.draft.applicableFrom || dueDate > input.draft.applicableUntil) {
    throw new Error("标准化观察窗口超出原文明确适用时间。");
  }
  if (input.formal.marketCode.trim().toUpperCase() !== input.draft.marketCode) throw new Error("正式预测标的与课程读数不一致。");
  const expectedKind = input.draft.horizon === "INTRADAY" ? "DAILY" : "WEEKLY";
  if (input.formal.kind !== expectedKind) throw new Error("课程周期与正式预测层级不一致。");
  if (input.formal.periodStart > decisionDate || input.formal.periodEnd < dueDate) throw new Error("标准化观察窗口超出正式预测有效期。");
  const studyKey = deterministicId("qimen-study", {
    formalKind: input.formal.kind,
    formalId: input.formal.id,
    horizon: input.draft.horizon,
    decisionAt: decisionAt.toISOString(),
    evaluationDueAt: evaluationDueAt.toISOString(),
  });
  const chartId = deterministicId("lesson-chart", {
    lessonId: input.lessonId,
    schoolId: input.draft.schoolId,
    chartQuote: input.draft.evidence.chartQuote,
  });
  const reading = {
    readingId: deterministicId("qimen-reading", {
      lessonId: input.lessonId,
      studyKey,
      schoolId: input.draft.schoolId,
      evidenceSha256: input.draft.evidenceSha256,
    }),
    studyKey,
    formalForecastKind: input.formal.kind,
    formalForecastId: input.formal.id,
    expectedFormalForecastVersion: `V${input.formal.version}`,
    horizon: input.draft.horizon,
    decisionAt: decisionAt.toISOString(),
    evaluationDueAt: evaluationDueAt.toISOString(),
    sourceEvidence: {
      sourceVersion: input.sourceVersion,
      transcriptSha256: input.sourceTranscriptSha256,
      reportSha256: input.sourceReportSha256,
      reportGeneratedAt: input.reportGeneratedAt,
      exactQuotes: [...new Set(allEvidenceQuotes(input.draft))],
    },
    reading: {
      schoolId: input.draft.schoolId,
      direction: input.draft.direction,
      confidence: input.draft.confidence,
      readiness: "RESEARCH_ONLY" as const,
      sourceId: `lesson:${input.lessonId}`,
      chartId,
      recordedAt: input.reportGeneratedAt,
      evidenceSha256: input.draft.evidenceSha256,
    },
  } satisfies QimenShadowReadingInput;
  return { reading, formal: input.formal };
}
