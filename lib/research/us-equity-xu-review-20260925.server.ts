import "server-only";

// Dated research edition; never an execution authority or a replacement for locked forecasts.
export const XU_REVIEW_VERSION = "us-equity-xu-20260925-v1";
export const XU_REVIEW_PERIOD = { start: "2026-10-08", end: "2026-11-06" } as const;
export const XU_REVIEW_POLICY = { mode: "RESEARCH_ONLY", modifiesLockedForecasts: false, executionAuthority: false } as const;
type Copy = { zh: string; en: string };
export type XuDay = { date: string; spy: Copy; qqq: Copy; caution?: Copy };
const c = (zh: string, en: string): Copy => ({ zh, en });
const repair = c("修复观察；月卦早段仍偏谨慎", "Repair watch; the monthly opening remains cautious");
const rally = c("反弹 / 试高观察", "Rebound / high-test watch");
const pressure = c("调整压力观察，不等于收盘必跌", "Pullback-pressure watch, not a guaranteed down close");
const turnUp = c("先弱、后观察修复；转折待确认", "Weakness first, then possible repair; turn unconfirmed");
const turnDown = c("先试高、后观察转弱", "High test first, then possible weakness");
const split = c("SPY 与 QQQ 分化，不合并方向", "SPY and QQQ diverge; do not merge their directions");
const monthConflict = c("月卦与细分周节奏不同，保留分歧", "Monthly and weekly paths differ; disagreement retained");
const eventRisk = c("FOMC 事件窗；行情可偏离原时间路径", "FOMC event window; price may depart from the source path");
const day = (date: string, spy: Copy, qqq: Copy = spy, caution?: Copy): XuDay => ({ date, spy, qqq, caution });

// Date labels are preserved from the supplied weekly comparison, provisionally
// mapped to US equity sessions. Intraday timezone is unspecified: no clock triggers.
export const XU_REVIEW_DAYS: readonly XuDay[] = [
  day("2026-10-08", repair, rally, monthConflict),
  day("2026-10-09", repair, rally, monthConflict),
  day("2026-10-12", rally, rally, c("美股正常开市；不能套用债市假日", "US equities open; a bond-market holiday is not an equity closure")),
  day("2026-10-13", turnDown, rally, split),
  day("2026-10-14", pressure, rally, split),
  day("2026-10-15", pressure, rally, split),
  day("2026-10-16", turnUp, turnDown, split),
  day("2026-10-19", turnDown, rally),
  day("2026-10-20", pressure, turnDown),
  day("2026-10-21", pressure),
  day("2026-10-22", pressure, pressure, c("SPY 月度低点候选，不是确认买点", "Candidate monthly SPY low, not a confirmed entry")),
  day("2026-10-23", turnUp, turnUp, c("早段低点候选；后段修复不代表趋势已反转", "Early low candidate; later repair does not establish a trend reversal")),
  day("2026-10-26", pressure, pressure, monthConflict),
  day("2026-10-27", turnUp, turnUp, eventRisk),
  day("2026-10-28", rally, rally, eventRisk),
  day("2026-10-29", turnDown),
  day("2026-10-30", pressure),
  day("2026-11-02", pressure, pressure, c("10/31 月度交接在周末；本日只是下一可观察交易日", "The Oct 31 monthly handoff is on a weekend; this is the next observable session")),
  day("2026-11-03", turnUp),
  day("2026-11-04", rally),
  day("2026-11-05", turnDown),
  day("2026-11-06", pressure, pressure, c("就业报告与周期收尾：事件波动不预设方向", "Jobs report and cycle end: event volatility has no predetermined direction")),
];

export function xuReviewContext(nowMs: number) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(nowMs);
  const phase = date < XU_REVIEW_PERIOD.start ? "upcoming" : date > XU_REVIEW_PERIOD.end ? "archive" : "active";
  return { date, phase, today: XU_REVIEW_DAYS.find(row => row.date === date) ?? null };
}

export const XU_OFFICIAL_REFERENCES = [
  { label: "FOMC · 10/27–28", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
  { label: "NYSE · 2026", url: "https://www.nyse.com/trade/hours-calendars" },
  { label: "Treasury · 2026", url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?field_tdr_date_value=2026&type=daily_treasury_yield_curve" },
  { label: "BLS · 11/6", url: "https://www.bls.gov/schedule/2026/" },
  { label: "BOJ FX · 9/24", url: "https://www.boj.or.jp/en/statistics/market/forex/fxdaily/fxlist/fx260924.pdf" },
] as const;
