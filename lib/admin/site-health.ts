import "server-only";

import { CORE_TOMORROW_ASSETS } from "@/lib/data/daily-forecasts";
import { buildWeeklyMarketSlots, resolveWeeklyDisplayWindow } from "@/lib/data/weekly-analysis";
import { listCurrentMonthlyMarketOutlooks } from "@/lib/data/monthly-market-outlook";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { isTradingDay } from "@/lib/calendar/next-trading-day";
import { CONVICTION_ASSET_SEED } from "@/lib/data/conviction/seed";
import { ACTIVE_STATIC_FOCUS_ASSET_IDS } from "@/lib/data/conviction/focus-registry-core";
import { listPublicConvictionCards } from "@/lib/data/conviction/store";
import { VIBE_EVIDENCE_ASSETS } from "@/lib/data/vibe/assets";
import { getVibeConnectionConfig } from "@/lib/data/vibe/client";
import { listVibeEvidence } from "@/lib/data/vibe/store";
import { isPaymentEmailConfigured, isPaymentEmailProductionReady } from "@/lib/email/notifications";
import { LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY } from "@/lib/research/liuyao-annual-coverage-2026";
import { listSocialCardsForDate } from "@/lib/social-cards/store";

export type SiteHealthSection = {
  key: string;
  label: string;
  expected: number;
  ready: number;
  missing: Array<{ assetId: string; assetName: string; reason: string }>;
};

export type SiteHealthReport = {
  generatedAt: string;
  beijingDate: string;
  status: "OK" | "ATTENTION";
  sections: SiteHealthSection[];
  automation: {
    cronSecretConfigured: boolean;
    bitgetConfigured: boolean;
    vibeConfigured: boolean;
    vibeEvidenceReady: number;
    emailConfigured: boolean;
    emailProductionReady: boolean;
    socialCardsToday: number;
    note: string;
  };
  notes: string[];
};

function rowIds(rows: Array<{ assetId: string; liuyaoEvidence?: string; qimenEvidence?: string }>): Set<string> {
  // A core daily row is only "ready" when both daily research viewpoints are present.
  // This turns a missing Liuyao/Qimen leg into an automatic freshness repair instead
  // of letting a direction-only row remain on the site for days.
  return new Set(
    rows
      .filter((row) => Boolean(row.liuyaoEvidence?.trim()) && Boolean(row.qimenEvidence?.trim()))
      .map((row) => row.assetId)
  );
}

export async function buildSiteHealthReport(now = new Date()): Promise<SiteHealthReport> {
  const todayResult = await Promise.allSettled([
    loadTodayForecastRows(now),
    loadTomorrowForecastRows(now),
  ]);
  const todayRows = todayResult[0].status === "fulfilled" ? todayResult[0].value : [];
  const tomorrowRows = todayResult[1].status === "fulfilled" ? todayResult[1].value : [];
  const todayIds = rowIds(todayRows);
  const tomorrowIds = rowIds(tomorrowRows);
  const todayKey = getBeijingTodayKey(now);

  const todayExpected = CORE_TOMORROW_ASSETS.filter((item) => isTradingDay(item.market, todayKey));
  const weeklySlots = buildWeeklyMarketSlots(now);
  const monthly = listCurrentMonthlyMarketOutlooks();
  const [focusCards, vibeRows, socialCardsToday] = await Promise.all([
    listPublicConvictionCards(),
    listVibeEvidence(),
    listSocialCardsForDate(todayKey),
  ]);
  const focusIds = new Set(focusCards.map((item) => item.id));
  const vibeIds = new Set(
    vibeRows.filter((item) => item.completeness > 0).map((item) => item.assetId)
  );
  const activeFocusIds = new Set<string>(ACTIVE_STATIC_FOCUS_ASSET_IDS);
  const expectedFocus = CONVICTION_ASSET_SEED.filter(
    (item) => activeFocusIds.has(item.id) && item.isPublished && item.status === "published"
  );
  const vibeConnection = getVibeConnectionConfig();

  const sections: SiteHealthSection[] = [
    {
      key: "today",
      label: "今日观点",
      expected: todayExpected.length,
      ready: todayExpected.filter((item) => todayIds.has(item.assetId)).length,
      missing: todayExpected
        .filter((item) => !todayIds.has(item.assetId))
        .map((item) => ({
          assetId: item.assetId,
          assetName: item.assetName,
          reason: "今天缺少完整六爻+奇门双观点，自动流水线将补跑",
        })),
    },
    {
      key: "tomorrow",
      label: "下一交易日观点",
      expected: CORE_TOMORROW_ASSETS.length,
      ready: CORE_TOMORROW_ASSETS.filter((item) => tomorrowIds.has(item.assetId)).length,
      missing: CORE_TOMORROW_ASSETS
        .filter((item) => !tomorrowIds.has(item.assetId))
        .map((item) => ({
          assetId: item.assetId,
          assetName: item.assetName,
          reason: "下一交易日缺少完整六爻+奇门双观点或正式周期来源",
        })),
    },
    {
      key: "weekly",
      label: resolveWeeklyDisplayWindow(now).displayMode === "NEXT_WEEK" ? "下周行情" : "本周行情",
      expected: weeklySlots.length,
      ready: weeklySlots.filter((slot) => slot.kind === "published").length,
      missing: weeklySlots
        .filter(
          (slot): slot is Extract<(typeof weeklySlots)[number], { kind: "unpublished" }> =>
            slot.kind === "unpublished"
        )
        .map((slot) => ({
          assetId: slot.assetId,
          assetName: slot.assetName,
          reason: "本周没有已锁定的原始研究记录",
        })),
    },
    {
      key: "monthly",
      label: "月度行情",
      expected: CORE_TOMORROW_ASSETS.length,
      ready: monthly.length,
      missing: CORE_TOMORROW_ASSETS
        .filter((item) => !monthly.some((row) => row.assetId === item.assetId))
        .map((item) => ({
          assetId: item.assetId,
          assetName: item.assetName,
          reason: "缺少当前月有效卦象或月度研究",
        })),
    },
    {
      key: "focus",
      label: "重点关注资产",
      expected: expectedFocus.length,
      ready: expectedFocus.filter((item) => focusIds.has(item.id)).length,
      missing: expectedFocus
        .filter((item) => !focusIds.has(item.id))
        .map((item) => ({
          assetId: item.id,
          assetName: item.nameZh,
          reason: "重点关注资产未发布或数据覆盖被覆盖配置关闭",
        })),
    },
    {
      key: "vibe",
      label: "Vibe客观证据",
      expected: VIBE_EVIDENCE_ASSETS.length,
      ready: VIBE_EVIDENCE_ASSETS.filter((item) => vibeIds.has(item.assetId)).length,
      missing: VIBE_EVIDENCE_ASSETS
        .filter((item) => !vibeIds.has(item.assetId))
        .map((item) => ({
          assetId: item.assetId,
          assetName: item.nameZh,
          reason: "没有可用证据快照，或数据完整度为0",
        })),
    },
    {
      key: "delivery",
      label: "交付与通知",
      expected: 2,
      ready: Number(isPaymentEmailProductionReady()) + Number(socialCardsToday.length > 0),
      missing: [
        ...(!isPaymentEmailProductionReady() ? [{ assetId: "email", assetName: "付款邮件", reason: isPaymentEmailConfigured() ? "已连接Resend，但尚未使用已验证的mooxintel.com发件域名" : "缺少RESEND_API_KEY与正式发件人配置" }] : []),
        ...(socialCardsToday.length === 0 ? [{ assetId: "social", assetName: "今日社交卡", reason: "今日尚未生成公开传播卡；Cron会自动重试一次" }] : []),
      ],
    },
  ];

  const hasMissing = sections.some((section) => section.missing.length > 0);
  return {
    generatedAt: now.toISOString(),
    beijingDate: todayKey,
    status: hasMissing ? "ATTENTION" : "OK",
    sections,
    automation: {
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      bitgetConfigured: Boolean(
        (process.env.BITGET_DEMO_API_KEY || process.env.BITGET_API_KEY) &&
          (process.env.BITGET_DEMO_SECRET_KEY || process.env.BITGET_SECRET_KEY)
      ),
      vibeConfigured: Boolean(vibeConnection.baseUrl),
      vibeEvidenceReady: vibeIds.size,
      emailConfigured: isPaymentEmailConfigured(),
      emailProductionReady: isPaymentEmailProductionReady(),
      socialCardsToday: socialCardsToday.length,
      note: "诊断只显示是否配置和覆盖数量，不返回密钥、余额、订单号或用户资料。",
    },
    notes: [
      `2026年卦盘点：老师年度基准${LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.confirmedTeacherAnnuals}张、年度专题${LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.supplementalTopics}张、核心独立缺口${LIUYAO_2026_ANNUAL_COVERAGE_SUMMARY.coreGaps}张；大盘背景不能替代指数或个股年卦。`,
      "六爻覆盖采用年卦、月卦、周卦主干；季卦只在重大切换或跨层级冲突时按需补充，不作为固定缺项。",
      "周末今日页只要求展示仍在交易的市场；休市市场应转至下一交易日观点，不算缺失。",
      "正式日度生成已统一使用九个核心市场流水线，不再按旧的亚洲、美股、原油批次分开生成。",
      "Vibe后端未配置时可继续使用内置证据快照；快照不会再显示为实时新鲜度100%。",
      "付款邮件与社交卡均进入交付健康检查；生产发件域名未验证时会明确提示。",
      "诊断页可替代逐页截图；系统不会创建额外管理员账号。",
    ],
  };
}
