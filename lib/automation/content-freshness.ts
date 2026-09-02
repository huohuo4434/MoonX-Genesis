import "server-only";

import { prisma } from "@/lib/prisma";
import { buildSiteHealthReport } from "@/lib/admin/site-health";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { getXIntelligenceSnapshot } from "@/lib/trading-signals/x-intelligence-summary";
import { ensureExternalAnalystTables, refreshExternalAnalystSignals } from "@/lib/trading-signals/external-analyst-signals";
import { generateAndStoreXScanReport } from "@/lib/trading-signals/x-scan-report";
import { runDailyForecastPipeline } from "@/lib/forecasts/daily-pipeline";
import { runDailyVerification } from "@/lib/verification/run-daily";
import { runFocusWeekRouteHandler } from "@/lib/data/conviction/focus-week-route-handler";
import { buildResearchIntegrityAudit } from "@/lib/research-integrity/audit";
import { ACTIVE_STATIC_FOCUS_ASSET_IDS } from "@/lib/data/conviction/focus-registry-core";
import { focusDailyMarketCode } from "@/lib/data/conviction/focus-daily-generation-core";
import { runGannForwardVerificationCycle } from "@/lib/research/gann-forward-verification.server";

import type { ContentFreshnessItem, ContentFreshnessPolicy, ContentFreshnessReport } from "@/types/content-freshness";

export const CONTENT_FRESHNESS_POLICIES: readonly ContentFreshnessPolicy[] = [
  { key: "x", label: "X博主扫描与观点矩阵", scheduleZh: "每15分钟", hardDeadlineZh: "心跳超过45分钟即异常", repairMode: "AUTO", noteZh: "自动重跑采集汇总与X扫描报告；不会自动批准任何观点。" },
  { key: "today", label: "首页／会员日报·今日预测", scheduleZh: "每3小时滚动生成；每15分钟自检缺失并补跑", hardDeadlineZh: "北京时间07:45前应具备当日可交易市场覆盖", repairMode: "AUTO", noteZh: "只从已锁定研究生成，不伪造周/月卦。" },
  { key: "tomorrow", label: "下一交易日预测", scheduleZh: "每3小时滚动生成；每15分钟自检缺失并补跑", hardDeadlineZh: "北京时间19:30后应具备下一交易日覆盖", repairMode: "AUTO", noteZh: "自检发现缺项后重跑日预测流水线。" },
  { key: "verification", label: "首页预测回顾／历史验证", scheduleZh: "每小时验证已收盘市场；每15分钟自检补偿", hardDeadlineZh: "收盘后进入可验证状态即更新", repairMode: "AUTO", noteZh: "首页直接读取公开验证库；不再靠静态回顾卡。" },
  { key: "focus", label: "重点关注逐日走势", scheduleZh: "每2小时滚动；每15分钟自检", hardDeadlineZh: "有当前正式周/月/长期研究时应自动生成逐日双观点", repairMode: "AUTO", noteZh: "日六爻由当前正式周期研究按周内路径和目标日干支自动拆分；未来日期可随已发生行情重排。" },
  { key: "integrity", label: "研究完整性", scheduleZh: "每15分钟自检", hardDeadlineZh: "九大市场与全部重点关注不应出现来源、双观点或1H技术位结构缺项", repairMode: "CHECK_ONLY", noteZh: "结构性缺项立即标记；可安全补跑的数据链由其他自动修复项负责。" },
  { key: "weekly", label: "会员周走势预测", scheduleZh: "周六20:00准备下一周，周内保持锁定版本", hardDeadlineZh: "周一07:30前应有当前周正式研究", repairMode: "CHECK_ONLY", noteZh: "周卦属于研究源，不允许自检程序伪造。" },
  { key: "monthly", label: "会员月走势预测", scheduleZh: "月末滚动准备，下月首日复核", hardDeadlineZh: "新月首日08:30前应有当前月有效研究", repairMode: "CHECK_ONLY", noteZh: "月卦缺失只报警，等待正式研究。" },
] as const;

const STATE_KEY = "content_freshness_report_v1";

function sectionItem(section: { key: string; label: string; expected: number; ready: number; missing: unknown[] }): ContentFreshnessItem {
  return {
    key: section.key,
    label: section.label,
    status: section.missing.length === 0 ? "OK" : section.ready === 0 ? "MISSING" : "ATTENTION",
    detailZh: section.missing.length === 0 ? `覆盖完整 ${section.ready}/${section.expected}` : `覆盖 ${section.ready}/${section.expected}，缺失 ${section.missing.length} 项`,
    ready: section.ready,
    expected: section.expected,
    lastUpdatedAt: null,
    repairable: ["today", "tomorrow", "focus"].includes(section.key),
  };
}

function daysBetween(a: string, b: string): number {
  const aa = Date.parse(`${a}T00:00:00Z`);
  const bb = Date.parse(`${b}T00:00:00Z`);
  return Number.isFinite(aa) && Number.isFinite(bb) ? Math.floor((aa - bb) / 86_400_000) : 999;
}

function addUtcDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(ms) ? new Date(ms + days * 86_400_000).toISOString().slice(0, 10) : date;
}

async function readFocusRuntimeDailyCoverage(asOfDate: string): Promise<{ ready: number; expected: number; missing: number } | null> {
  const db = prisma;
  if (!db) return null;
  const dates = [asOfDate, addUtcDays(asOfDate, 1)];
  const codes = ACTIVE_STATIC_FOCUS_ASSET_IDS.map(focusDailyMarketCode);
  try {
    const rows = await db.generatedDailyForecast.findMany({
      where: {
        marketCode: { in: codes },
        forecastDate: { in: dates },
        status: { in: ["PUBLISHED", "LOCKED"] },
      },
      select: { marketCode: true, forecastDate: true },
    });
    const pairs = new Set(rows.map((row) => `${row.marketCode}|${row.forecastDate}`));
    const expected = codes.length * dates.length;
    return { ready: pairs.size, expected, missing: Math.max(0, expected - pairs.size) };
  } catch {
    return null;
  }
}

async function evaluate(now: Date): Promise<ContentFreshnessReport> {
  const [site, history, x] = await Promise.all([
    buildSiteHealthReport(now),
    getPublicAccuracyHistory(now).catch(() => null),
    getXIntelligenceSnapshot({ force: true, now }).catch(() => null),
  ]);
  const [focusRuntime, integrity] = await Promise.all([
    readFocusRuntimeDailyCoverage(site.beijingDate),
    Promise.resolve(buildResearchIntegrityAudit({ asOfDate: site.beijingDate, nowMs: now.getTime() })),
  ]);
  const base = site.sections.filter((section) => ["today", "tomorrow", "weekly", "monthly", "focus"].includes(section.key)).map(sectionItem);
  const focusBase = base.find((item) => item.key === "focus");
  if (focusBase && focusRuntime) {
    focusBase.ready = focusRuntime.ready;
    focusBase.expected = focusRuntime.expected;
    focusBase.status = focusRuntime.missing === 0 ? "OK" : focusRuntime.ready === 0 ? "MISSING" : "ATTENTION";
    focusBase.detailZh = focusRuntime.missing === 0
      ? `今日+次日逐日双观点运行覆盖完整 ${focusRuntime.ready}/${focusRuntime.expected}`
      : `今日+次日逐日双观点覆盖 ${focusRuntime.ready}/${focusRuntime.expected}，缺失 ${focusRuntime.missing} 项，将自动补跑`;
    focusBase.repairable = true;
  }
  const xItem: ContentFreshnessItem = {
    key: "x",
    label: "X博主扫描与观点矩阵",
    status: !x ? "MISSING" : x.collector.status === "HEALTHY" ? "OK" : x.collector.status === "STALE" || x.collector.status === "ERROR" ? "STALE" : "ATTENTION",
    detailZh: x ? `${x.collector.message} 24小时有效线索 ${x.aggregate.parsedPosts24h} 条。` : "X采集状态不可读取。",
    ready: x?.aggregate.parsedPosts24h ?? 0,
    expected: null,
    lastUpdatedAt: x?.collector.lastCheckedAt ?? null,
    repairable: true,
  };
  const latestDate = history?.latestVisibleDate ?? null;
  const verificationStale = !latestDate || daysBetween(site.beijingDate, latestDate) > 4;
  const verificationItem: ContentFreshnessItem = {
    key: "verification",
    label: "首页预测回顾／历史验证",
    status: verificationStale ? (latestDate ? "STALE" : "MISSING") : "OK",
    detailZh: latestDate ? `最新公开验证预测日期 ${latestDate}，当前公开记录 ${history?.items.length ?? 0} 条。` : "暂无公开已完成验证记录。",
    ready: history?.items.length ?? 0,
    expected: null,
    lastUpdatedAt: latestDate,
    repairable: true,
  };
  const integrityItem: ContentFreshnessItem = {
    key: "integrity",
    label: "研究完整性",
    status: integrity.summary.criticalIssues === 0 ? "OK" : "ATTENTION",
    detailZh: `九大市场 ${integrity.summary.coreOk}/${integrity.summary.coreTotal}；重点关注结构 ${integrity.summary.focusOk}/${integrity.summary.focusTotal}；${focusRuntime ? `今日+次日运行数据 ${focusRuntime.ready}/${focusRuntime.expected}；` : ""}结构缺项 ${integrity.summary.criticalIssues}。`,
    ready: integrity.summary.coreOk + integrity.summary.focusOk,
    expected: integrity.summary.coreTotal + integrity.summary.focusTotal,
    lastUpdatedAt: integrity.generatedAt,
    repairable: false,
  };
  const order = ["x", "today", "tomorrow", "verification", "focus", "integrity", "weekly", "monthly"];
  const map = new Map([...base, xItem, verificationItem, integrityItem].map((item) => [item.key, item]));
  const items = order.flatMap((key) => map.get(key) ? [map.get(key)!] : []);
  return {
    version: 1,
    generatedAt: now.toISOString(),
    beijingDate: site.beijingDate,
    status: items.some((item) => item.status !== "OK") ? "ATTENTION" : "OK",
    items,
    policies: CONTENT_FRESHNESS_POLICIES,
    repairs: [],
    noteZh: "自检只做可安全重复的补跑和重新验证，不会修改程序代码、不伪造缺失年卦/月卦/周卦，也不会事后改写已锁定预测。季卦属于按需桥接层，不单独触发缺失报警。",
  };
}

async function storeReport(report: ContentFreshnessReport): Promise<void> {
  const db = prisma;
  if (!db || !(await ensureExternalAnalystTables())) return;
  await db.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    STATE_KEY,
    JSON.stringify(report),
  );
}

export async function getStoredContentFreshnessReport(): Promise<ContentFreshnessReport | null> {
  const db = prisma;
  if (!db || !(await ensureExternalAnalystTables())) return null;
  const rows = await db.$queryRawUnsafe<Array<{ payload: unknown }>>(
    `SELECT payload FROM trade_external_analyst_state WHERE state_key = $1 LIMIT 1`,
    STATE_KEY,
  );
  const payload = rows[0]?.payload;
  if (!payload) return null;
  if (typeof payload === "string") {
    try { return JSON.parse(payload) as ContentFreshnessReport; } catch { return null; }
  }
  return payload as ContentFreshnessReport;
}

export async function runContentFreshnessSelfCheck(options: { repair?: boolean; now?: Date } = {}): Promise<ContentFreshnessReport> {
  const now = options.now ?? new Date();
  const before = await evaluate(now);
  const repairs: ContentFreshnessReport["repairs"] = [];
  if (options.repair !== false) {
    const byKey = new Map(before.items.map((item) => [item.key, item]));
    const x = byKey.get("x");
    if (x && x.status !== "OK") {
      try {
        const refresh = await refreshExternalAnalystSignals(now, { force: true });
        await generateAndStoreXScanReport(now);
        repairs.push({ key: "x", ok: refresh.errors.length === 0, actionZh: "重跑X采集汇总与扫描报告", detailZh: refresh.message });
      } catch (error) {
        repairs.push({ key: "x", ok: false, actionZh: "重跑X采集汇总与扫描报告", detailZh: error instanceof Error ? error.message : String(error) });
      }
    }
    const today = byKey.get("today");
    const tomorrow = byKey.get("tomorrow");
    if ((today && today.status !== "OK") || (tomorrow && tomorrow.status !== "OK")) {
      try {
        const report = await runDailyForecastPipeline({ forcePhase: "lock" });
        repairs.push({ key: "daily", ok: report.errors.length === 0, actionZh: "补跑九大市场日预测流水线", detailZh: `生成/更新 ${report.upserted.length}，跳过 ${report.skipped.length}，错误 ${report.errors.length}` });
      } catch (error) {
        repairs.push({ key: "daily", ok: false, actionZh: "补跑九大市场日预测流水线", detailZh: error instanceof Error ? error.message : String(error) });
      }
    }
    const verification = byKey.get("verification");
    if (verification && verification.status !== "OK") {
      try {
        const report = await runDailyVerification({ now });
        repairs.push({ key: "verification", ok: report.errors.length === 0, actionZh: "补跑已收盘市场验证", detailZh: `扫描 ${report.scanned}，新验证 ${report.verified}，待行情 ${report.notReady}，错误 ${report.errors.length}` });
      } catch (error) {
        repairs.push({ key: "verification", ok: false, actionZh: "补跑已收盘市场验证", detailZh: error instanceof Error ? error.message : String(error) });
      }
    }
    const focus = byKey.get("focus");
    if (focus && focus.status !== "OK") {
      try {
        const response = await runFocusWeekRouteHandler({ authorized: true, capturedNow: now });
        const body = await response.json().catch(() => ({})) as Record<string, unknown>;
        repairs.push({ key: "focus", ok: response.ok, actionZh: "补跑重点关注逐日准备", detailZh: response.ok ? `完成：${String(body.kind ?? "PREPARED")}` : `失败：${String(body.error ?? response.status)}` });
      } catch (error) {
        repairs.push({ key: "focus", ok: false, actionZh: "补跑重点关注逐日准备", detailZh: error instanceof Error ? error.message : String(error) });
      }
    }
    // Verification is safe and idempotent; run a lightweight pass each self-check even when not stale,
    // so homepage "最近验证" never depends on a single missed hourly cron.
    if (!repairs.some((item) => item.key === "verification")) {
      try {
        const report = await runDailyVerification({ now });
        repairs.push({ key: "verification", ok: report.errors.length === 0, actionZh: "例行验证补偿检查", detailZh: `扫描 ${report.scanned}，新验证 ${report.verified}，待行情 ${report.notReady}` });
      } catch (error) {
        repairs.push({ key: "verification", ok: false, actionZh: "例行验证补偿检查", detailZh: error instanceof Error ? error.message : String(error) });
      }
    }
    try {
      const gann = await runGannForwardVerificationCycle(now);
      repairs.push({ key: "gann", ok: gann.stored, actionZh: "锁定并复核江恩前瞻样本", detailZh: `观察 ${gann.watching}，待行情 ${gann.pending}，已评分 ${gann.scored}` });
    } catch (error) {
      repairs.push({ key: "gann", ok: false, actionZh: "锁定并复核江恩前瞻样本", detailZh: error instanceof Error ? error.message : String(error) });
    }
  }
  const after = await evaluate(now);
  after.repairs = repairs;
  await storeReport(after).catch(() => undefined);
  return after;
}
