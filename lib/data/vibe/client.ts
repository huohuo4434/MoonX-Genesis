import "server-only";

import { VIBE_EVIDENCE_ASSETS, type VibeEvidenceAssetConfig } from "@/lib/data/vibe/assets";
import { calculateVibeScore, freshnessFromIso, makeDimension } from "@/lib/data/vibe/scorer";
import { listVibeEvidence, writeVibeEvidence } from "@/lib/data/vibe/store";
import type {
  VibeConnectionStatus,
  VibeEvidenceDimension,
  VibeEvidenceSnapshot,
} from "@/types/vibe-evidence";

function trimBaseUrl(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return text.replace(/\/+$/, "");
}

export function getVibeConnectionConfig() {
  return {
    baseUrl: trimBaseUrl(process.env.VIBE_RESEARCH_BASE_URL),
    apiKey: process.env.VIBE_RESEARCH_API_KEY?.trim() || null,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function testVibeConnection(): Promise<VibeConnectionStatus> {
  const checkedAt = new Date().toISOString();
  const { baseUrl, apiKey } = getVibeConnectionConfig();
  if (!baseUrl) {
    return {
      configured: false,
      baseUrl: null,
      apiKeyConfigured: Boolean(apiKey),
      healthy: false,
      service: null,
      version: null,
      checkedAt,
      error: "VIBE_RESEARCH_BASE_URL尚未配置，当前使用内置证据快照。",
    };
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/health`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      service?: string;
      version?: string;
      detail?: string;
    };
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.detail || `HTTP ${response.status}`);
    }
    return {
      configured: true,
      baseUrl,
      apiKeyConfigured: Boolean(apiKey),
      healthy: true,
      service: payload.service ?? "vibe-research-api",
      version: payload.version ?? null,
      checkedAt,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      baseUrl,
      apiKeyConfigured: Boolean(apiKey),
      healthy: false,
      service: null,
      version: null,
      checkedAt,
      error: error instanceof Error ? error.message : "Vibe连接失败",
    };
  }
}

type FlatEntry = { path: string; value: number };

function flattenNumbers(value: unknown, prefix = "", output: FlatEntry[] = []): FlatEntry[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    output.push({ path: prefix.toLowerCase(), value });
    return output;
  }
  if (Array.isArray(value)) {
    value.slice(0, 40).forEach((item, index) => flattenNumbers(item, `${prefix}[${index}]`, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>)
      .slice(0, 120)
      .forEach(([key, nested]) => flattenNumbers(nested, prefix ? `${prefix}.${key}` : key, output));
  }
  return output;
}

function flattenStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.slice(0, 60).forEach((item) => flattenStrings(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>)
      .slice(0, 160)
      .forEach((nested) => flattenStrings(nested, output));
  }
  return output;
}

function pickMetric(entries: FlatEntry[], patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const hit = entries.find((entry) => pattern.test(entry.path));
    if (hit) return hit.value;
  }
  return null;
}

function average(scores: number[]): number | null {
  const finite = scores.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function growthScore(value: number | null): number | null {
  if (value == null) return null;
  if (value >= 40) return 90;
  if (value >= 20) return 70;
  if (value >= 10) return 48;
  if (value > 0) return 22;
  if (value > -10) return -20;
  if (value > -30) return -55;
  return -85;
}

function roeScore(value: number | null): number | null {
  if (value == null) return null;
  if (value >= 25) return 80;
  if (value >= 15) return 55;
  if (value >= 8) return 25;
  if (value >= 0) return 0;
  return -70;
}

function marginScore(value: number | null): number | null {
  if (value == null) return null;
  if (value >= 60) return 65;
  if (value >= 35) return 42;
  if (value >= 15) return 18;
  if (value >= 0) return -5;
  return -65;
}

function debtScore(value: number | null): number | null {
  if (value == null) return null;
  if (value <= 30) return 45;
  if (value <= 50) return 20;
  if (value <= 70) return -20;
  return -60;
}

function peScore(value: number | null): number | null {
  if (value == null || value <= 0) return null;
  if (value < 12) return 55;
  if (value < 22) return 30;
  if (value < 35) return 5;
  if (value < 55) return -25;
  return -55;
}

function percentileScore(value: number | null): number | null {
  if (value == null) return null;
  const normalized = value <= 1 ? value * 100 : value;
  if (normalized <= 20) return 55;
  if (normalized <= 40) return 25;
  if (normalized <= 65) return 0;
  if (normalized <= 80) return -25;
  return -55;
}

function capitalScore(entries: FlatEntry[]): number | null {
  const flow = entries
    .filter((entry) => /(main.*(net|flow)|主力.*(净|流)|fund.*flow|net.*inflow)/i.test(entry.path))
    .slice(-12)
    .map((entry) => entry.value);
  const margin = entries
    .filter((entry) => /(margin.*(change|ratio)|融资.*(变化|余额)|rzye)/i.test(entry.path))
    .slice(-6)
    .map((entry) => entry.value);
  const holders = entries
    .filter((entry) => /(holder.*(change|ratio)|股东户数.*(变化|增减))/i.test(entry.path))
    .slice(-4)
    .map((entry) => -entry.value);

  const normalizeSigned = (value: number) => {
    if (value > 10) return 65;
    if (value > 2) return 35;
    if (value > 0) return 15;
    if (value < -10) return -65;
    if (value < -2) return -35;
    if (value < 0) return -15;
    return 0;
  };

  const scores = [...flow, ...margin, ...holders].map(normalizeSigned);
  return average(scores);
}

function industryScore(entries: FlatEntry[], strings: string[]): number | null {
  const changes = entries
    .filter((entry) => /(industry|sector|板块|行业).*(change|pct|涨跌|rank|strength)/i.test(entry.path))
    .slice(-8)
    .map((entry) => entry.value);
  if (changes.length) {
    return average(changes.map((value) => (value > 3 ? 60 : value > 0 ? 25 : value < -3 ? -60 : value < 0 ? -25 : 0)));
  }
  const joined = strings.join(" ");
  if (/排名靠前|强势|领涨|资金流入|景气上行/.test(joined)) return 35;
  if (/排名靠后|弱势|领跌|资金流出|景气下行/.test(joined)) return -35;
  return null;
}

function eventScore(strings: string[]): number | null {
  if (!strings.length) return null;
  const positive = ["增长", "预增", "回购", "中标", "突破", "上调", "扩产", "签约", "盈利", "创纪录", "新高"];
  const negative = ["下滑", "预亏", "减持", "处罚", "诉讼", "终止", "下调", "亏损", "风险", "问询", "立案"];
  const recent = strings.slice(0, 80).join(" ");
  let score = 0;
  positive.forEach((word) => {
    if (recent.includes(word)) score += 9;
  });
  negative.forEach((word) => {
    if (recent.includes(word)) score -= 11;
  });
  return Math.max(-70, Math.min(70, score));
}

function dimensionSummary(label: string, score: number | null): string {
  if (score == null) return `${label}数据暂缺，未按0分或利空处理。`;
  if (score >= 45) return `${label}证据偏强。`;
  if (score >= 15) return `${label}证据偏多。`;
  if (score <= -45) return `${label}压力较强。`;
  if (score <= -15) return `${label}证据偏空。`;
  return `${label}证据中性或分歧较大。`;
}

function buildDimensions(payloads: unknown[]): VibeEvidenceDimension[] {
  const numeric = payloads.flatMap((payload) => flattenNumbers(payload));
  const strings = payloads.flatMap((payload) => flattenStrings(payload));

  const revenueYoy = pickMetric(numeric, [/revenue.*yoy/, /operate.*income.*yoy/, /营.*收.*同比/, /营业.*收入.*同比/]);
  const profitYoy = pickMetric(numeric, [/net.*profit.*yoy/, /profit.*yoy/, /净利润.*同比/]);
  const roe = pickMetric(numeric, [/(^|\.)roe(_avg)?$/, /净资产收益率/]);
  const grossMargin = pickMetric(numeric, [/gross.*margin/, /gross.*profit.*ratio/, /毛利率/]);
  const debtRatio = pickMetric(numeric, [/debt.*ratio/, /debt.*asset.*ratio/, /资产负债率/]);
  const financial = average([
    growthScore(revenueYoy),
    growthScore(profitYoy),
    roeScore(roe),
    marginScore(grossMargin),
    debtScore(debtRatio),
  ].filter((value): value is number => value != null));

  const pe = pickMetric(numeric, [/(^|\.)(pe|pe_ttm|forward_pe)$/, /市盈率/, /forward.*pe/]);
  const peg = pickMetric(numeric, [/(^|\.)peg$/, /peg/]);
  const pePct = pickMetric(numeric, [/pe.*percentile/, /pe.*分位/, /市盈率.*分位/]);
  const pbPct = pickMetric(numeric, [/pb.*percentile/, /pb.*分位/, /市净率.*分位/]);
  const valuationScores = [peScore(pe), percentileScore(pePct), percentileScore(pbPct)];
  if (peg != null) valuationScores.push(peg < 1 ? 35 : peg < 2 ? 5 : -30);
  const valuation = average(valuationScores.filter((value): value is number => value != null));
  const capital = capitalScore(numeric);
  const industry = industryScore(numeric, strings);
  const events = eventScore(strings);

  return [
    makeDimension({ key: "financialQuality", score: financial ?? 0, available: financial != null, summary: dimensionSummary("财务质量", financial) }),
    makeDimension({ key: "valuation", score: valuation ?? 0, available: valuation != null, summary: dimensionSummary("估值位置", valuation) }),
    makeDimension({ key: "capitalPositioning", score: capital ?? 0, available: capital != null, summary: dimensionSummary("资金与筹码", capital) }),
    makeDimension({ key: "industryStrength", score: industry ?? 0, available: industry != null, summary: dimensionSummary("行业相对强弱", industry) }),
    makeDimension({ key: "events", score: events ?? 0, available: events != null, summary: dimensionSummary("公告与事件", events) }),
  ];
}

function extractSupports(dimensions: VibeEvidenceDimension[]): string[] {
  return dimensions
    .filter((item) => item.available && item.score >= 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => `${item.labelZh}：${item.summary}`);
}

function extractRisks(dimensions: VibeEvidenceDimension[]): string[] {
  return dimensions
    .filter((item) => item.available && item.score <= -15)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((item) => `${item.labelZh}：${item.summary}`);
}

async function fetchEndpoint(baseUrl: string, endpoint: string, apiKey: string | null) {
  const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : `HTTP ${response.status}`;
    throw new Error(`${endpoint}: ${detail}`);
  }
  return payload.data ?? payload;
}

async function refreshOne(
  config: VibeEvidenceAssetConfig,
  previous: VibeEvidenceSnapshot
): Promise<VibeEvidenceSnapshot> {
  const { baseUrl, apiKey } = getVibeConnectionConfig();
  if (!baseUrl) {
    return {
      ...previous,
      lastError: "VIBE_RESEARCH_BASE_URL尚未配置，继续使用内置证据快照。",
    };
  }

  const payloads: unknown[] = [];
  const sourceEndpoints: string[] = [];
  const errors: string[] = [];
  for (const endpoint of config.endpoints) {
    try {
      payloads.push(await fetchEndpoint(baseUrl, endpoint, apiKey));
      sourceEndpoints.push(endpoint);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${endpoint}: 未知错误`);
    }
  }

  if (!payloads.length) {
    return {
      ...previous,
      lastError: errors.join("；") || "Vibe未返回可用数据",
      updatedAt: new Date().toISOString(),
    };
  }

  const updatedAt = new Date().toISOString();
  const dimensions = buildDimensions(payloads);
  const score = calculateVibeScore({
    dimensions,
    freshness: freshnessFromIso(updatedAt),
  });
  const dataGaps = dimensions
    .filter((item) => !item.available)
    .map((item) => `${item.labelZh}数据暂缺`);
  if (errors.length) dataGaps.push(...errors.slice(0, 5));

  return {
    ...previous,
    ...score,
    sourceMode: "VIBE_API",
    sourceLabel: "Vibe-Research客观数据接口",
    dimensions,
    supports: extractSupports(dimensions),
    risks: extractRisks(dimensions),
    dataGaps,
    sourceEndpoints,
    updatedAt,
    lastSuccessAt: updatedAt,
    lastError: errors.length ? errors.join("；") : null,
    version: previous.version + 1,
  };
}

export async function refreshVibeEvidence(input?: { assetId?: string }) {
  const current = await listVibeEvidence();
  const selected = input?.assetId
    ? VIBE_EVIDENCE_ASSETS.filter((asset) => asset.assetId === input.assetId)
    : VIBE_EVIDENCE_ASSETS;
  const byId = new Map(current.map((row) => [row.assetId, row] as const));
  const results: VibeEvidenceSnapshot[] = [];

  for (const config of selected) {
    const previous = byId.get(config.assetId);
    if (!previous) continue;
    const refreshed = await refreshOne(config, previous);
    byId.set(config.assetId, refreshed);
    results.push(refreshed);
  }

  await writeVibeEvidence([...byId.values()]);
  return {
    refreshed: results,
    all: [...byId.values()],
  };
}
