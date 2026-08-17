import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  getTodayForecastAccessPayload,
  getTomorrowForecastAccessPayload,
} from "@/lib/prediction-access-server";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import {
  displayMarketCode,
  normalizeFormalDirection,
} from "@/lib/forecasts/formal-direction";
import { isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import type { DailyForecast } from "@/types/daily-forecast";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/get-public-history";

const CORE_MARKETS = [
  { symbol: "BTC", name: "比特币" },
  { symbol: "ETH", name: "以太坊" },
  { symbol: "SPX", name: "标普500" },
  { symbol: "NDX", name: "纳斯达克100" },
  { symbol: "WTI", name: "WTI原油" },
  { symbol: "GOLD", name: "黄金" },
  { symbol: "SILVER", name: "白银" },
  { symbol: "SHCOMP", name: "上证A股" },
  { symbol: "HSTECH", name: "恒生科技" },
] as const;

type HomeDirection =
  | "上涨"
  | "震荡上涨"
  | "先跌后涨"
  | "震荡"
  | "先涨后跌"
  | "震荡下跌"
  | "下跌";

function canonicalSymbol(symbol: string): string {
  const code = displayMarketCode(symbol).trim().toUpperCase();
  if (code === "GLD" || code === "GC" || code === "XAU" || code === "XAUUSD") return "GOLD";
  if (code === "SI" || code === "SLV" || code === "XAG" || code === "XAGUSD") return "SILVER";
  if (code === "CL" || code === "CL=F") return "WTI";
  if (code === "000001.SS" || code === "SSEC" || code === "SSE") return "SHCOMP";
  return code;
}

function homeDirection(forecast: DailyForecast): HomeDirection {
  const normalized = normalizeFormalDirection(
    forecast.directionLabel || forecast.pathBias || forecast.direction
  );
  if (normalized === "探底回升") return "先跌后涨";
  if (normalized === "冲高回落") return "先涨后跌";
  return normalized;
}

function confidenceStars(forecast: DailyForecast): number {
  if (forecast.consensusStars) return forecast.consensusStars;
  const score = forecast.consensusScore ?? forecast.confidence ?? 0;
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

function starsText(value: number): string {
  return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function cleanLevel(value: string | undefined): string {
  if (!value) return "待补充";
  return value
    .replace(/^(第一|第二|第三)?(支撑|压力)(区|位)?[：:]\s*/u, "")
    .replace(/[（(][^）)]*(来源|密集|MACD|均线|触碰|共振)[^）)]*[）)]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function firstLevel(levels: string[] | undefined): string {
  return cleanLevel(levels?.find((item) => item.trim().length > 0));
}

function beijingHour(now: Date): number {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(text);
}

function zhDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function zhDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function directionClass(direction: HomeDirection): string {
  const classes: Record<HomeDirection, string> = {
    上涨: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    震荡上涨: "border-teal-400/30 bg-teal-500/15 text-teal-200",
    先跌后涨: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    震荡: "border-sky-400/25 bg-sky-500/10 text-sky-200",
    先涨后跌: "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-100",
    震荡下跌: "border-orange-400/30 bg-orange-500/15 text-orange-100",
    下跌: "border-rose-400/30 bg-rose-500/15 text-rose-200",
  };
  return classes[direction];
}

function buildMarketRows(forecasts: DailyForecast[]) {
  const bySymbol = new Map(
    forecasts
      .filter(isHumanPublishedForecast)
      .map((forecast) => [canonicalSymbol(forecast.symbol), forecast] as const)
  );

  return CORE_MARKETS.map((market) => ({
    ...market,
    forecast: bySymbol.get(market.symbol),
  }));
}

function selectHighlights(forecasts: DailyForecast[]) {
  return forecasts
    .filter(isHumanPublishedForecast)
    .sort((left, right) => {
      const stars = confidenceStars(right) - confidenceStars(left);
      if (stars !== 0) return stars;
      return (right.confidence ?? 0) - (left.confidence ?? 0);
    })
    .slice(0, 3);
}

function selectVerification(items: PublicAccuracyHistoryItem[]) {
  const complete = items.filter((item) => item.verdictLabel === "完全命中");
  const partial = items.filter((item) => item.verdictLabel === "部分命中");
  const selected: PublicAccuracyHistoryItem[] = [];
  for (const item of [...complete, ...partial, ...items]) {
    if (selected.some((row) => row.forecastId === item.forecastId)) continue;
    selected.push(item);
    if (selected.length === 3) break;
  }
  return selected;
}

export async function HomeLandingBoard() {
  noStore();
  const now = new Date();

  const [todayResult, tomorrowResult, verificationResult] = await Promise.allSettled([
    getTodayForecastAccessPayload(now),
    getTomorrowForecastAccessPayload(now),
    getPublicAccuracyHistory(now),
  ]);

  const todayPayload = todayResult.status === "fulfilled" ? todayResult.value : null;
  const tomorrowPayload = tomorrowResult.status === "fulfilled" ? tomorrowResult.value : null;
  const todayForecasts = todayPayload?.allowed ? todayPayload.forecasts : [];
  const tomorrowForecasts = tomorrowPayload?.allowed ? tomorrowPayload.forecasts : [];
  const marketRows = buildMarketRows(todayForecasts);
  const todayHighlights = selectHighlights(todayForecasts);
  const tomorrowHighlights =
    beijingHour(now) >= 20 ? selectHighlights(tomorrowForecasts) : [];
  const verificationItems =
    verificationResult.status === "fulfilled"
      ? selectVerification(verificationResult.value.items)
      : [];

  const todayAccessMessage =
    todayPayload && !todayPayload.allowed
      ? todayPayload.message
      : "今日观点正在整理中";

  return (
    <main className="min-h-screen bg-[#06070b] text-white">
      <section
        id="daily-board"
        className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,190,210,0.13),transparent_28%),linear-gradient(180deg,#0d1020_0%,#06070b_100%)]"
      >
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] text-violet-300">
                  MOOX DAILY BOARD
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  九大市场今日预测
                </h1>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-white/62 sm:text-base">
                  奇门看势，六爻验应，技术定点。日分析以奇门遁甲作精细化第一主判，六爻只作辅助印证；
                  两法同向即记为「共振」，信心星级随之提升；若相左，则以奇门为纲并主动降级。
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs"> {/* MOOX_QIMEN_DAILY_RESONANCE_V7201_METHOD */}
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-violet-200">奇门主判</span>
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-cyan-200">六爻辅助</span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-amber-100">共振加权</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-white/55">技术定点</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/member/weekly"
                  className="rounded-full border border-violet-400/35 bg-violet-500/18 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/28"
                >
                  本周会员周报
                </Link>
                <Link
                  href="/verification"
                  className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  历史验证
                </Link>
              </div>
            </div>

            {todayPayload?.allowed ? (
              <div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                <table className="min-w-full border-separate border-spacing-y-2 text-left">
                  <thead>
                    <tr className="text-xs tracking-[0.16em] text-white/42">
                      <th className="px-3 py-2">市场</th>
                      <th className="px-3 py-2">今日预测</th>
                      <th className="px-3 py-2">信心</th>
                      <th className="px-3 py-2">关键支撑</th>
                      <th className="px-3 py-2">关键压力</th>
                      <th className="px-3 py-2">更新</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketRows.map(({ symbol, name, forecast }) => {
                      const direction = forecast ? homeDirection(forecast) : null;
                      const confidence = forecast ? confidenceStars(forecast) : null;
                      return (
                        <tr
                          key={symbol}
                          className="bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                        >
                          <td className="rounded-l-2xl px-3 py-3">
                            <div className="font-medium">{name}</div>
                            <div className="mt-1 text-xs text-white/42">{symbol}</div>
                          </td>
                          <td className="px-3 py-3">
                            {direction ? (
                              <>
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${directionClass(direction)}`}
                                >
                                  {direction}
                                </span>
                                {forecast?.qimenMysticNote ? (
                                  <p className="mt-2 max-w-[320px] text-xs leading-5 text-violet-100/64">
                                    <span className="mr-1 font-medium text-violet-300/90">盘语</span>
                                    {forecast.qimenMysticNote}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-sm text-white/45">待发布</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {confidence ? (
                              <>
                                <span className="font-mono text-base tracking-[0.16em] text-amber-200">
                                  {starsText(confidence)}
                                </span>
                                {forecast?.qimenAgreementLabel ? (
                                  <div className="mt-1 text-[11px] text-white/42">{forecast.qimenAgreementLabel}</div>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-white/35">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-white/74">
                            {forecast ? firstLevel(forecast.supportLevels) : "—"}
                          </td>
                          <td className="px-3 py-3 text-sm text-white/74">
                            {forecast ? firstLevel(forecast.resistanceLevels) : "—"}
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 text-xs text-white/42">
                            {forecast
                              ? zhDateTime(forecast.updatedAt || forecast.publishedAt)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-5">
                <div className="text-lg font-medium">登录后查看九大市场完整日度表</div>
                <p className="mt-2 text-sm leading-6 text-white/58">{todayAccessMessage}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/login?next=/"
                    className="rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white"
                  >
                    登录查看
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/80"
                  >
                    会员方案
                  </Link>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs leading-6 text-white/42">
              星级表达奇门与六爻等方法的一致程度：共振则提升、分歧则降级；盘语只提炼用神与门星神关系，不代表涨跌幅或收益保证。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-400/15 bg-[linear-gradient(160deg,rgba(9,29,42,0.96),rgba(8,11,20,0.98))] p-6">
            <p className="text-sm tracking-[0.18em] text-cyan-300/85">今日看点</p>
            <h2 className="mt-2 text-2xl font-semibold">高信心方向</h2>
            <div className="mt-5 grid gap-3">
              {todayHighlights.length ? (
                todayHighlights.map((forecast) => {
                  const direction = homeDirection(forecast);
                  return (
                    <div
                      key={forecast.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.045] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{forecast.assetName}</div>
                          <div className="mt-1 text-sm text-white/48">
                            支撑 {firstLevel(forecast.supportLevels)} · 压力{" "}
                            {firstLevel(forecast.resistanceLevels)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex rounded-full border px-3 py-1 text-sm ${directionClass(direction)}`}
                          >
                            {direction}
                          </div>
                          <div className="mt-2 font-mono text-sm tracking-[0.16em] text-amber-200">
                            {starsText(confidenceStars(forecast))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/55">
                  今日高信心看点正在整理中。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-violet-400/15 bg-[linear-gradient(160deg,rgba(37,23,67,0.96),rgba(10,10,21,0.98))] p-6">
            <p className="text-sm tracking-[0.18em] text-violet-300/85">明日看点</p>
            <h2 className="mt-2 text-2xl font-semibold">下一交易日观点</h2>
            {tomorrowHighlights.length ? (
              <div className="mt-5 grid gap-3">
                {tomorrowHighlights.map((forecast) => {
                  const direction = homeDirection(forecast);
                  return (
                    <div
                      key={forecast.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.045] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">{forecast.assetName}</div>
                          <div className="mt-1 text-sm text-white/48">
                            目标日期 {zhDate(forecast.forecastForDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`inline-flex rounded-full border px-3 py-1 text-sm ${directionClass(direction)}`}
                          >
                            {direction}
                          </div>
                          <div className="mt-2 font-mono text-sm tracking-[0.16em] text-amber-200">
                            {starsText(confidenceStars(forecast))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-5">
                <div className="text-lg font-medium">明日观点将在北京时间 20:00 发布</div>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  发布后仅展示当前有效锁定版本，不在首页剧透周度和月度研究。
                </p>
              </div>
            )}
            <div className="mt-4">
              <Link
                href="/member/tomorrow"
                className="inline-flex rounded-full border border-violet-400/35 bg-violet-500/18 px-4 py-2 text-sm font-medium text-violet-100"
              >
                查看明日观点
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-2 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/featured-stocks"
            className="rounded-3xl border border-violet-400/15 bg-[linear-gradient(135deg,rgba(25,17,48,0.97),rgba(9,10,17,0.98))] p-6 transition hover:-translate-y-0.5 hover:border-violet-400/30"
          >
            <p className="text-sm tracking-[0.18em] text-violet-300/85">重点关注</p>
            <h2 className="mt-2 text-2xl font-semibold">深度研究入口</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">
              首页不再直接列出具体股票和币种，完整重点研究统一从这里进入。
            </p>
          </Link>

          <Link
            href="/member/technical-methods"
            className="rounded-3xl border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(8,38,50,0.97),rgba(8,10,17,0.98))] p-6 transition hover:-translate-y-0.5 hover:border-cyan-400/30"
          >
            <p className="text-sm tracking-[0.18em] text-cyan-300/85">缠论技术面</p>
            <h2 className="mt-2 text-2xl font-semibold">看结构与关键位置</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">
              展示分型、笔、线段、中枢、背驰及关键支撑压力，让方向判断落到执行位置。
            </p>
          </Link>

          <Link
            href="/member/ai-trading"
            className="rounded-3xl border border-pink-400/15 bg-[linear-gradient(135deg,rgba(55,20,46,0.97),rgba(10,9,16,0.98))] p-6 transition hover:-translate-y-0.5 hover:border-pink-400/30"
          >
            <p className="text-sm tracking-[0.18em] text-pink-300/85">AI自动交易</p>
            <h2 className="mt-2 text-2xl font-semibold">持仓、保护单与风控</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">
              进入交易台查看AI执行状态、真实持仓、保护单和风险闸门。
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(14,25,26,0.98),rgba(8,9,14,0.98))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm tracking-[0.18em] text-emerald-300/85">最近验证</p>
              <h2 className="mt-2 text-2xl font-semibold">优先展示完全命中</h2>
            </div>
            <Link href="/verification" className="text-sm text-emerald-200">
              查看全部历史验证 →
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {verificationItems.length ? (
              verificationItems.map((item) => (
                <div
                  key={item.forecastId}
                  className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.assetName}</div>
                      <div className="mt-1 text-sm text-white/48">
                        预测日期 {zhDate(item.forecastDate)}
                      </div>
                      <div className="mt-1 text-sm text-white/65">
                        预测 {item.predictedDirection} · 实际 {item.actualDirection}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-sm ${
                        item.verdictLabel === "完全命中"
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                          : "border-amber-400/30 bg-amber-500/15 text-amber-100"
                      }`}
                    >
                      {item.verdictLabel}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/55">
                暂无可展示的已验证记录。
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
