import "server-only";

import { CORE_TOMORROW_ASSETS } from "@/lib/data/daily-forecasts";
import { buildWeeklyMarketSlots, resolveWeeklyDisplayWindow } from "@/lib/data/weekly-analysis";
import { listCurrentMonthlyMarketOutlooks } from "@/lib/data/monthly-market-outlook";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { isTradingDay } from "@/lib/calendar/next-trading-day";

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
    note: string;
  };
  notes: string[];
};

function rowIds(rows: Array<{ assetId: string }>): Set<string> {
  return new Set(rows.map((row) => row.assetId));
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

  const sections: SiteHealthSection[] = [
    {
      key: "today",
      label: "今日观点",
      expected: todayExpected.length,
      ready: todayExpected.filter((item) => todayIds.has(item.assetId)).length,
      missing: todayExpected
        .filter((item) => !todayIds.has(item.assetId))
        .map((item) => ({ assetId: item.assetId, assetName: item.assetName, reason: "今天有交易时段，但尚未生成可展示的正式观点" })),
    },
    {
      key: "tomorrow",
      label: "下一交易日观点",
      expected: CORE_TOMORROW_ASSETS.length,
      ready: CORE_TOMORROW_ASSETS.filter((item) => tomorrowIds.has(item.assetId)).length,
      missing: CORE_TOMORROW_ASSETS
        .filter((item) => !tomorrowIds.has(item.assetId))
        .map((item) => ({ assetId: item.assetId, assetName: item.assetName, reason: "缺少覆盖下一交易日的正式预测或周度来源" })),
    },
    {
      key: "weekly",
      label: resolveWeeklyDisplayWindow(now).displayMode === "NEXT_WEEK" ? "下周行情" : "本周行情",
      expected: weeklySlots.length,
      ready: weeklySlots.filter((slot) => slot.kind === "published").length,
      missing: weeklySlots
        .filter((slot): slot is Extract<(typeof weeklySlots)[number], { kind: "unpublished" }> => slot.kind === "unpublished")
        .map((slot) => ({ assetId: slot.assetId, assetName: slot.assetName, reason: "本周没有已锁定的原始研究记录" })),
    },
    {
      key: "monthly",
      label: "月度行情",
      expected: CORE_TOMORROW_ASSETS.length,
      ready: monthly.length,
      missing: CORE_TOMORROW_ASSETS
        .filter((item) => !monthly.some((row) => row.assetId === item.assetId))
        .map((item) => ({ assetId: item.assetId, assetName: item.assetName, reason: "缺少当前月有效卦象或月度研究" })),
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
      bitgetConfigured: Boolean((process.env.BITGET_DEMO_API_KEY || process.env.BITGET_API_KEY) && (process.env.BITGET_DEMO_SECRET_KEY || process.env.BITGET_SECRET_KEY)),
      note: "诊断只显示是否配置，不返回密钥、余额、订单号或用户资料。",
    },
    notes: [
      "周末今日页只要求展示仍在交易的市场；休市市场应转至下一交易日观点，不算缺失。",
      "白银当前月度原始研究只覆盖至2026-08-19，之后需要新的白银卦象。",
      "诊断页可替代逐页截图；不会创建额外管理员账号。",
    ],
  };
}
