import "server-only";

import { getBeijingTodayKey, getBeijingTomorrowKey } from "@/lib/calendar/beijing-date";
import { ASIA_BATCH_KEYS, US_BATCH_KEYS, WTI_BATCH_KEYS, publicAtIso } from "@/lib/calendar/publish-windows";
import { WTI_EXT_PATH_RECORD_ID } from "@/lib/data/wti-path-ext-20260807";
import {
  getWtiExtPathEngineWeightPct,
  mustNotDrivePublicWtiDirection,
} from "@/lib/research/wti-ext-path-engine";
import { DAILY_ACCURACY_ASSETS } from "@/types/daily-accuracy";
import { defaultCutoffAt, fetchRecentDailyBarsForForecast } from "@/lib/market-data/daily-prices";
import {
  listDailyForecastRecords,
  listLearningCases,
  upsertDailyForecastRecord,
} from "@/lib/data/moonx-data-store";
import { buildSimilarCaseKey, computeLearningAdjustment, findSimilarCases } from "@/lib/automation/learning";
import type { GeneratedForecastDraft } from "@/types/automation";
import type { DailyForecastRecord } from "@/types/daily-accuracy";
import { DIRECTION_LABELS, PATTERN_LABELS } from "@/types/daily-accuracy";
import { patternFromText } from "@/lib/verification/pattern-classifier";
import { consensusStarsFromInputs } from "@/lib/forecasts/consensus-confidence";
import { PUBLISHED_DAILY_FORECASTS } from "@/lib/data/published-daily-forecasts-20260728";
import { listResearchRecords } from "@/lib/data/research-records";
import { buildTeacherSourceBlend, teacherBlendAssetIdForDailyKey } from "@/lib/research/teacher-source-weights";
import { computeWeightedResearchVote } from "@/lib/research/weighted-research-vote";

type AssetKey = (typeof DAILY_ACCURACY_ASSETS)[number]["key"];

type Evidence = {
  sourceIds: string[];
  sourceType: GeneratedForecastDraft["sourceType"];
  sourceLabel: string;
  lean: "UP" | "DOWN" | "FLAT" | "ABSTAIN";
  confidence: number;
  summaryBits: string[];
  pathBits: string[];
  invalidation: string;
  headline: string;
  frameworkCount: number;
  hasTechnical: boolean;
  agreementRatio: number;
};

function normalizeProbs(up: number, flat: number, down: number): { up: number; flat: number; down: number } {
  const sum = Math.max(up + flat + down, 1);
  const u = Math.round((up / sum) * 100);
  let f = Math.round((flat / sum) * 100);
  let d = 100 - u - f;
  if (d < 0) {
    f += d;
    d = 0;
  }
  return { up: u, flat: f, down: d };
}

async function technicalContext(assetKey: AssetKey, forecastDate: string): Promise<string | null> {
  const asset = DAILY_ACCURACY_ASSETS.find((a) => a.key === assetKey);
  if (!asset) return null;
  try {
    const bars = await fetchRecentDailyBarsForForecast({
      quoteSymbol: asset.quoteSymbol,
      market: asset.market,
      asOfDate: forecastDate,
    });
    if (bars.length < 2) return null;
    const last = bars[bars.length - 1]!;
    const prev = bars[bars.length - 2]!;
    const chg = ((last.close - prev.close) / prev.close) * 100;
    return `${asset.quoteSymbol} 最近完整日线收盘 ${last.close.toFixed(2)}（相对前收 ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%，区间 ${last.low.toFixed(2)}–${last.high.toFixed(2)}）。`;
  } catch {
    return null;
  }
}

async function gatherEvidence(assetKey: AssetKey, forecastDate: string): Promise<Evidence | null> {
  const curated = PUBLISHED_DAILY_FORECASTS.find(
    (f) =>
      f.forecastForDate === forecastDate &&
      ((assetKey === "BTC" && f.symbol === "BTC") ||
        (assetKey === "NDX" && f.symbol === "NDX") ||
        (assetKey === "SPX" && (f.symbol === "SPX" || f.symbol === "^GSPC")) ||
        (assetKey === "SSE" && (f.symbol === "000001.SS" || f.symbol === "SSEC")) ||
        (assetKey === "HSTECH" && f.symbol === "HSTECH") ||
        (assetKey === "GLD" && (f.symbol === "GLD" || f.symbol === "GOLD" || f.symbol === "GC=F")) ||
        (assetKey === "WTI" && (f.symbol === "WTI" || f.symbol === "CL=F")))
  );
  if (curated) {
    const lean =
      curated.directionLabel?.includes("跌") ||
      curated.directionLabel === "先涨后跌" ||
      curated.directionLabel === "冲高回落" ||
      curated.direction === "看跌" ||
      curated.direction === "略微看跌"
        ? "DOWN"
        : curated.directionLabel === "区间震荡" ||
            curated.directionLabel?.includes("震荡整理") ||
            curated.direction === "中性"
          ? "FLAT"
          : "UP";
    const tech = await technicalContext(assetKey, forecastDate);
    return {
      sourceIds: [curated.id, ...(curated.evidenceRecordIds ?? [])],
      sourceType: "cycle_derivation",
      sourceLabel: "内部周期资料与技术结构综合推演",
      lean,
      confidence: curated.confidence,
      summaryBits: [curated.summary, tech].filter(Boolean) as string[],
      pathBits: curated.expectedPath ?? [],
      invalidation: curated.invalidation ?? "关键结构被破坏则原判断失效。",
      headline: curated.headline ?? `${curated.assetName}日度推演`,
      frameworkCount: Math.max(2, new Set(["cycle", ...(curated.evidenceRecordIds ?? []).map(() => "research")]).size),
      hasTechnical: Boolean(tech),
      agreementRatio: Math.max(curated.probabilities?.up ?? 0, curated.probabilities?.flat ?? 0, curated.probabilities?.down ?? 0) / 100,
    };
  }

  const records = await listResearchRecords();
  const assetHints: Record<AssetKey, string[]> = {
    BTC: ["bitcoin", "btc", "比特币"],
    ETH: ["ethereum", "eth", "以太坊"],
    SPX: ["sp500", "spx", "s&p", "标普", "breadth", "宽度"],
    NDX: ["nasdaq", "ndx", "us-equity", "半导体", "ai"],
    SSE: ["shanghai", "sse", "a-share", "上证"],
    HSTECH: ["hang-seng", "hstech", "恒生"],
    GLD: ["gold", "gld", "黄金"],
    SILVER: ["silver", "si=f", "白银", "银价", "comex silver"],
    WTI: ["crude", "oil", "wti", "原油", "nymex"],
  };
  const hints = assetHints[assetKey];
  const matched = records.filter((r) => {
    if (r.forecastStart && forecastDate < r.forecastStart) return false;
    if (r.forecastEnd && forecastDate > r.forecastEnd) return false;
    if (r.expiresAt && new Date(`${forecastDate}T12:00:00Z`).getTime() >= new Date(r.expiresAt).getTime()) return false;
    const blob = `${r.id} ${r.assetId ?? ""} ${JSON.stringify(r.title ?? {})}`.toLowerCase();
    if (assetKey === "SPX" && /nasdaq|ndx|纳指/.test(blob) && !hints.some((h) => blob.includes(h.toLowerCase()))) {
      return false;
    }
    if (!hints.some((h) => blob.includes(h.toLowerCase()))) return false;
    // External WTI long path: never drive public lean when weight is 0; never leak long targets into summary.
    if (assetKey === "WTI" && r.id === WTI_EXT_PATH_RECORD_ID) {
      if (mustNotDrivePublicWtiDirection(r.id, forecastDate)) return false;
      // Keep as background-only source id; exclude from direction voting set below.
      return true;
    }
    return true;
  });

  const tech = await technicalContext(assetKey, forecastDate);
  if (!matched.length && !tech) return null;

  if (!matched.length) {
    return {
      sourceIds: [`tech-${assetKey}-${forecastDate}`],
      sourceType: "insufficient",
      sourceLabel: "内部周期资料与技术结构综合推演",
      lean: "ABSTAIN",
      confidence: 40,
      summaryBits: ["现有研究依据不足以给出明确日度方向，标记为暂无判断，不对外发布。", tech ?? ""].filter(Boolean),
      pathBits: ["暂无判断，不生成正式方向"],
      invalidation: "出现可验证的上涨、下跌或震荡依据后再发布。",
      headline: `${DAILY_ACCURACY_ASSETS.find((a) => a.key === assetKey)?.assetName ?? assetKey}暂无明确结论`,
      frameworkCount: tech ? 1 : 0,
      hasTechnical: Boolean(tech),
      agreementRatio: 0,
    };
  }

  const directionVoters = matched.filter(
    (r) => !(assetKey === "WTI" && r.id === WTI_EXT_PATH_RECORD_ID)
  );
  const teacherAssetId = teacherBlendAssetIdForDailyKey(assetKey);
  const teacherBlend = teacherAssetId
    ? buildTeacherSourceBlend({ assetId: teacherAssetId, asOfDate: forecastDate, records })
    : null;
  const vote = computeWeightedResearchVote({
    records: directionVoters.length ? directionVoters : matched,
    teacherBlend,
  });
  const ids = vote.sourceIds.length ? vote.sourceIds : matched.slice(0, 5).map((r) => r.id);
  const lean: Evidence["lean"] = vote.lean;

  if (lean === "ABSTAIN") {
    return {
      sourceIds: ids,
      sourceType: "insufficient",
      sourceLabel: "内部周期资料与技术结构综合推演",
      lean: "ABSTAIN",
      confidence: 40,
      summaryBits: ["现有研究依据不足以给出明确日度方向，标记为暂无判断，不对外发布。", tech ?? ""].filter(Boolean),
      pathBits: ["暂无判断，不生成正式方向"],
      invalidation: "出现可验证的上涨、下跌或震荡依据后再发布。",
      headline: `${DAILY_ACCURACY_ASSETS.find((a) => a.key === assetKey)?.assetName ?? assetKey}暂无明确结论`,
      frameworkCount: tech ? 1 : 0,
      hasTechnical: Boolean(tech),
      agreementRatio: 0,
    };
  }

  const wtiExtWeight =
    assetKey === "WTI" ? getWtiExtPathEngineWeightPct(forecastDate) : 0;
  const focusNote =
    assetKey === "SPX"
      ? "标普判断侧重市场宽度与金融、工业、消费、科技权重的综合表现，不得直接照搬纳指结论。"
      : assetKey === "NDX"
        ? "纳指判断侧重大型科技、半导体与AI板块。"
        : assetKey === "WTI"
          ? `WTI结合日线/4小时结构、美元、库存供需与地缘风险；不机械套用长期原油目标。行情及验证使用近月连续合约。${
              wtiExtWeight > 0
                ? `内部中长期路径仅作背景（权重上限${wtiExtWeight}%），不得泄露65—80长期目标或后期大涨路线。`
                : "内部外部长期路径后期权重为0%，不得影响公开短周期方向。"
            }`
          : "";

  const primary = vote.primaryRecord ?? directionVoters[0] ?? matched[0];
  return {
    sourceIds: ids,
    sourceType: "cycle_derivation",
    sourceLabel: teacherBlend
      ? "六爻主体系、辅助六爻与技术结构综合推演"
      : "内部周期资料与技术结构综合推演",
    lean,
    confidence: vote.confidence,
    summaryBits: [
      focusNote,
      teacherBlend?.publicSummary ?? "",
      "基于仍在有效期内的内部周期资料进行日度推演，非今日新起六爻卦。",
      // Never paste long-horizon external WTI summary into public draft text.
      primary?.id === WTI_EXT_PATH_RECORD_ID
        ? ""
        : primary?.summary?.zhCN ?? primary?.title?.zhCN ?? "",
      tech ?? "",
    ].filter(Boolean),
    pathBits: teacherBlend
      ? ["主六爻定方向", "辅助六爻补充周内窗口", "价格结构确认后执行"]
      : ["围绕既有节奏观察", "关注关键位得失"],
    invalidation: primary?.invalidation?.zhCN ?? "有效研究框架被价格结构明确破坏。",
    headline: `${DAILY_ACCURACY_ASSETS.find((a) => a.key === assetKey)?.assetName}日度综合推演`,
    frameworkCount: Math.max(vote.frameworkCount, tech ? 2 : 1),
    hasTechnical: Boolean(tech),
    agreementRatio: vote.agreementRatio,
  };
}

export async function generateForecastBatch(
  batch: "asia" | "us" | "wti",
  now = new Date()
): Promise<{ created: number; skipped: number; drafts: GeneratedForecastDraft[] }> {
  const keys =
    batch === "asia" ? ASIA_BATCH_KEYS : batch === "wti" ? WTI_BATCH_KEYS : US_BATCH_KEYS;
  const forecastDate = batch === "asia" ? getBeijingTomorrowKey(now) : getBeijingTodayKey(now);
  const existing = await listDailyForecastRecords();
  const learning = await listLearningCases();
  let created = 0;
  let skipped = 0;
  const drafts: GeneratedForecastDraft[] = [];
  const assets = DAILY_ACCURACY_ASSETS.filter((a) => (keys as readonly string[]).includes(a.key));

  for (const asset of assets) {
    const id = `AUTO-${asset.key}-${forecastDate.replace(/-/g, "")}-V1`;
    if (existing.some((r) => r.id === id || (r.forecastDate === forecastDate && r.symbol === asset.symbol))) {
      skipped += 1;
      continue;
    }

    const evidence = await gatherEvidence(asset.key, forecastDate);
    const caseKey = buildSimilarCaseKey({
      assetClass: asset.market,
      horizon: "daily",
      direction: evidence?.lean ?? "ABSTAIN",
      marketRegime: "unknown",
      structures: ["cycle_derivation"],
    });
    const similar = findSimilarCases(learning, caseKey, 10);
    const learningAdj = computeLearningAdjustment(similar);

    if (!evidence || evidence.lean === "ABSTAIN") {
      skipped += 1;
      continue;
    }

    let confidence = Math.max(1, Math.min(99, evidence.confidence + learningAdj.confidenceDelta));
    let direction = evidence.lean;
    if (confidence < 50 && (direction === "UP" || direction === "DOWN")) {
      direction = "FLAT";
      confidence = Math.min(confidence, 49);
    }

    const consensus = consensusStarsFromInputs({
      confidence,
      frameworkCount: Math.max(1, evidence.frameworkCount),
      hasTechnical: evidence.hasTechnical,
      pathDefined: evidence.pathBits.length > 0,
      agreementRatio: evidence.agreementRatio,
    });

    const probs =
      direction === "UP"
        ? normalizeProbs(confidence, Math.round((100 - confidence) * 0.55), Math.round((100 - confidence) * 0.45))
        : direction === "DOWN"
          ? normalizeProbs(Math.round((100 - confidence) * 0.45), Math.round((100 - confidence) * 0.55), confidence)
          : normalizeProbs(Math.round((100 - confidence) / 2), confidence, Math.round((100 - confidence) / 2));

    const draft: GeneratedForecastDraft = {
      id,
      forecastDate,
      assetName: asset.assetName,
      symbol: asset.symbol,
      market: asset.market,
      direction,
        directionLabel:
        direction === "UP" ? "上涨" : direction === "DOWN" ? "下跌" : "震荡",
      probabilities: probs,
      confidence,
      consensusStars: consensus.stars,
      consensusScore: consensus.score,
      consensusLabel: consensus.label,
      headline: evidence.headline,
      summary: evidence.summaryBits.join(" "),
      expectedPath: evidence.pathBits,
      invalidation: evidence.invalidation,
      sourceIds: evidence.sourceIds,
      sourceType: evidence.sourceType,
      sourceLabel: evidence.sourceLabel,
      generatedAt: now.toISOString(),
      cutoffAt: defaultCutoffAt(forecastDate, asset.market),
      status: "published",
      visibility: "member",
      accuracyEligible: true,
      originalVersion: 1,
      learningAdjustments: learningAdj,
      quoteSymbol: asset.quoteSymbol,
    };
    drafts.push(draft);
    await upsertDailyForecastRecord(draftToRecord(draft));
    created += 1;
    void publicAtIso;
  }

  return { created, skipped, drafts };
}

/** @deprecated Use generateForecastBatch('asia'|'us'|'wti') */
export async function generateTomorrowForecasts(now = new Date()) {
  const asia = await generateForecastBatch("asia", now);
  const wti = await generateForecastBatch("wti", now);
  const us = await generateForecastBatch("us", now);
  return {
    created: asia.created + wti.created + us.created,
    skipped: asia.skipped + wti.skipped + us.skipped,
    drafts: [...asia.drafts, ...wti.drafts, ...us.drafts],
  };
}

function draftToRecord(d: GeneratedForecastDraft): DailyForecastRecord {
  const direction = d.direction === "ABSTAIN" ? "FLAT" : d.direction;
  const pattern = patternFromText(
    [d.directionLabel, ...(d.expectedPath ?? []), d.summary].filter(Boolean).join(" "),
    direction
  );
  return {
    id: d.id,
    forecastDate: d.forecastDate,
    assetName: d.assetName,
    symbol: d.symbol,
    market: d.market,
    direction,
    directionLabel: DIRECTION_LABELS[direction],
    predictedPattern: pattern.pattern,
    predictedPatternLabel: PATTERN_LABELS[pattern.pattern],
    expectedPath: d.expectedPath,
    probability: d.confidence,
    consensusStars: d.consensusStars,
    consensusScore: d.consensusScore,
    consensusLabel: d.consensusLabel,
    summary: `[${d.sourceLabel}] ${d.summary}`,
    publishedAt: d.generatedAt,
    cutoffAt: d.cutoffAt,
    status: d.accuracyEligible ? "published" : "invalid",
    originalVersion: d.originalVersion,
    source: d.sourceLabel,
    isSystemTest: false,
    quoteSymbol: d.quoteSymbol,
    createdAt: d.generatedAt,
    updatedAt: d.generatedAt,
    reviewedAt: d.generatedAt,
  };
}
