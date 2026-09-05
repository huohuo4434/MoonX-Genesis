// MOOX_V7206_VERIFICATION_RANKING
// MOOX_V72052_HOME_FRESH
import Link from "next/link";
import { cache, Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { displayMarketCode, normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import { isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import type { DailyForecast } from "@/types/daily-forecast";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/get-public-history";
import { cleanDailyLevel } from "@/lib/forecasts/daily-display-reason";
import { HomeMobileAppView } from "@/components/home/HomeMobileAppView";
import { HomeIntradayLevelPair } from "@/components/home/HomeIntradayLevelPair";
import { HomeWelcome } from "@/components/home/HomeWelcome";
import { getRequestLocale } from "@/lib/i18n/server";
// V7.20.7 compatibility note: getPublicUnifiedLiveSnapshot moved off the homepage critical render path in V7.20.8.

const CORE_MARKETS = [
  { symbol: "BTC", name: "比特币" },
  { symbol: "ETH", name: "以太坊" },
  { symbol: "NDX", name: "纳斯达克100" },
  { symbol: "GOLD", name: "黄金" },
  { symbol: "SILVER", name: "白银" },
] as const;

type HomeDirection = "上涨" | "震荡上涨" | "先跌后涨" | "震荡" | "先涨后跌" | "震荡下跌" | "下跌";

function canonicalSymbol(symbol: string): string {
  const code = displayMarketCode(symbol).trim().toUpperCase();
  if (["GLD", "GC", "XAU", "XAUUSD"].includes(code)) return "GOLD";
  if (["SI", "SLV", "XAG", "XAGUSD"].includes(code)) return "SILVER";
  if (["CL", "CL=F"].includes(code)) return "WTI";
  if (["000001.SS", "SSEC", "SSE"].includes(code)) return "SHCOMP";
  return code;
}

function homeDirection(forecast: DailyForecast): HomeDirection {
  const normalized = normalizeFormalDirection(forecast.directionLabel || forecast.pathBias || forecast.direction);
  if (normalized === "探底回升") return "先跌后涨";
  if (normalized === "冲高回落") return "先涨后跌";
  return normalized;
}

function confidenceStars(forecast: DailyForecast): number {
  if (forecast.consensusLabel === "未单独评估") return 0;
  if (forecast.consensusStars) return forecast.consensusStars;
  const score = forecast.consensusScore ?? forecast.confidence ?? 0;
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

function starsText(value: number): string {
  return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
}

function zhDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

function zhDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
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
  const bySymbol = new Map(forecasts.filter(isHumanPublishedForecast).map((forecast) => [canonicalSymbol(forecast.symbol), forecast] as const));
  return CORE_MARKETS.map((market) => ({ ...market, forecast: bySymbol.get(market.symbol) }));
}

type VerificationSelection = { item: PublicAccuracyHistoryItem };

function selectVerification(items: PublicAccuracyHistoryItem[], now = new Date()): VerificationSelection[] {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const core = items
    .filter((item) => CORE_MARKETS.some((market) => market.symbol === canonicalSymbol(item.symbol)))
    .filter((item) => item.forecastDate < todayKey);
  const targetDate = core.map((item) => item.forecastDate).sort().at(-1);
  if (!targetDate) return [];

  const accepted = new Set(["HIT", "FULL_HIT", "PARTIAL_HIT"]);
  const seen = new Set<string>();
  const selected: VerificationSelection[] = [];
  for (const item of core
    .filter((row) => row.forecastDate === targetDate && accepted.has(row.verdict))
    .sort((a, b) => String(b.verifiedAt).localeCompare(String(a.verifiedAt)))) {
    const symbol = canonicalSymbol(item.symbol);
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    selected.push({ item });
  }
  return selected.sort((a, b) => {
    const left = CORE_MARKETS.findIndex((market) => market.symbol === canonicalSymbol(a.item.symbol));
    const right = CORE_MARKETS.findIndex((market) => market.symbol === canonicalSymbol(b.item.symbol));
    return left - right;
  });
}

const MEMBER_ENTRIES = [
  { href: "/member/daily", eyebrow: "会员日报", title: "今天与下一交易日", body: "方向、关键位、失效条件和当天风险，一页看完。", tone: "violet" },
  { href: "/member/weekly-report", eyebrow: "会员周报", title: "本周机会与风险", body: "只保留最值得跟踪的机会、主要风险和行动清单。", tone: "cyan" },
  { href: "/member/ai-trading", eyebrow: "AI交易研究", title: "计划、持仓与盈亏", body: "查看研究计划、管理员账户持仓和每单已实现盈亏。", tone: "pink" },
] as const;

export function HomeLandingBoard() {
  return (
    <main id="moonx-view" className="min-h-screen bg-[#06070b] text-white">
      <Suspense fallback={<HomeLandingFallback />}>
        <HomeLandingData />
      </Suspense>
    </main>
  );
}

async function HomeLandingData() {
  noStore();
  const locale = await getRequestLocale();
  const now = new Date();
  const todayResult = await Promise.allSettled([getTodayForecastAccessPayload(now)]);
  const todayPayload = todayResult[0].status === "fulfilled" ? todayResult[0].value : null;
  const todayAccessMessage = todayPayload && !todayPayload.allowed ? todayPayload.message : "今日观点正在整理中";
  // English home is a product entry; localized research remains at /en/member/daily.
  if (!todayPayload?.allowed || locale === "en") {
    return <HomeWelcome locale={locale} canViewDaily={Boolean(todayPayload?.allowed)} />;
  }
  const todayForecasts = todayPayload?.allowed ? todayPayload.forecasts : [];
  const marketRows = buildMarketRows(todayForecasts);
  const publishedRows = marketRows.filter((row) => Boolean(row.forecast));
  const mobileMarkets = publishedRows
    .map((row) => {
      const forecast = row.forecast!;
      const relation = forecast.qimenAgreementLabel ?? "";
      const resonanceRank = /共振/u.test(relation) ? 2 : /分歧/u.test(relation) ? 0 : 1;
      return {
        symbol: row.symbol,
        name: row.name,
        direction: homeDirection(forecast),
        confidenceStars: confidenceStars(forecast),
        resonance: relation,
        support: cleanDailyLevel(forecast.supportLevels?.[0]),
        resistance: cleanDailyLevel(forecast.resistanceLevels?.[0]),
        reason: "",
        resonanceRank,
      };
    })
    .sort((a, b) => b.resonanceRank - a.resonanceRank || b.confidenceStars - a.confidenceStars || a.symbol.localeCompare(b.symbol))
    .slice(0, 3)
    .map((row) => ({
      symbol: row.symbol,
      name: row.name,
      direction: row.direction,
      confidenceStars: row.confidenceStars,
      resonance: row.resonance,
      support: row.support,
      resistance: row.resistance,
      reason: row.reason,
    }));
  const resonanceCount = publishedRows.filter((row) => /共振/u.test(row.forecast?.qimenAgreementLabel ?? "")).length;
  const divergenceCount = publishedRows.filter((row) => /分歧/u.test(row.forecast?.qimenAgreementLabel ?? "")).length;
  const latestTodayUpdate = publishedRows
    .map((row) => row.forecast?.updatedAt || row.forecast?.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return (
    <>
      <span hidden data-home-dashboard />
      <HomeMobileAppView
        canViewDaily={Boolean(todayPayload?.allowed)}
        accessMessage={todayAccessMessage}
        markets={mobileMarkets}
        resonanceCount={resonanceCount}
        divergenceCount={divergenceCount}
        publishedCount={publishedRows.length}
      />
      <Suspense fallback={<HomeMobileVerificationFallback />}>
        <HomeMobileVerificationData nowIso={now.toISOString()} />
      </Suspense>
      <div className="hidden md:block">
      <section className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,190,210,0.13),transparent_28%),linear-gradient(180deg,#0d1020_0%,#06070b_100%)]">
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] text-violet-300">MOOX DAILY BOARD</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">五大市场每日方向研究</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">看方向，等确认，守失效。预测先锁定；命中、部分命中与未命中全部进入公开验证。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={todayPayload?.allowed ? "/member/daily" : "/register?next=/"} className="rounded-full border border-violet-400/35 bg-violet-500/18 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/28">{todayPayload?.allowed ? "查看今日研究" : "免费注册看今日"}</Link>
                <Link href="/verification" className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20">公开验证</Link>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/58">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5">今日已发布 {publishedRows.length} 条</span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">目标日期 {publishedRows[0]?.forecast?.forecastForDate ? zhDate(publishedRows[0].forecast.forecastForDate) : "待发布"}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">最近更新 {zhDateTime(latestTodayUpdate)}</span>
            </div>

            {todayPayload?.allowed && publishedRows.length > 0 ? (
              <div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                <table data-server-levels="true" className="min-w-full border-separate border-spacing-y-2 text-left">
                  <thead><tr className="text-xs tracking-[0.16em] text-white/42"><th className="px-3 py-2">市场</th><th className="px-3 py-2">今日预测</th><th className="px-3 py-2">信心</th><th className="px-3 py-2">关键支撑</th><th className="px-3 py-2">关键压力</th><th className="px-3 py-2">更新</th></tr></thead>
                  <tbody>
                    {marketRows.map(({ symbol, name, forecast }) => {
                      const direction = forecast ? homeDirection(forecast) : null;
                      const confidence = forecast ? confidenceStars(forecast) : null;
                      return <tr key={symbol} className="bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                        <td className="rounded-l-2xl px-3 py-3"><div className="font-medium">{name}</div><div className="mt-1 text-xs text-white/42">{symbol}</div></td>
                        <td className="px-3 py-3">{direction ? <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${directionClass(direction)}`}>{direction}</span> : <span className="text-sm text-white/45">待发布</span>}</td>
                        <td className="px-3 py-3">{confidence ? <><span className="font-mono text-base tracking-[0.16em] text-amber-200">{starsText(confidence)}</span>{forecast?.qimenAgreementLabel ? <div className="mt-1 text-[11px] text-white/42">{forecast.qimenAgreementLabel}</div> : null}</> : <span className="text-white/35">—</span>}</td>
                        {forecast ? <Suspense fallback={<><td className="px-3 py-3 text-sm text-white/40">计算中…</td><td className="px-3 py-3 text-sm text-white/40">计算中…</td></>}><HomeIntradayLevelPair symbol={symbol} direction={direction} fallbackSupport={forecast.supportLevels?.[0]} fallbackResistance={forecast.resistanceLevels?.[0]} /></Suspense> : <><td className="px-3 py-3 text-sm text-white/35">—</td><td className="px-3 py-3 text-sm text-white/35">—</td></>}
                        <td className="rounded-r-2xl px-3 py-3 text-xs text-white/42">{forecast ? zhDateTime(forecast.updatedAt || forecast.publishedAt) : "—"}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-5">
                <div className="text-lg font-medium">{todayPayload?.allowed ? "今日预测暂未读到" : "登录后查看五大市场完整日度表"}</div>
                <p className="mt-2 text-sm leading-6 text-white/58">{todayPayload?.allowed ? "系统会继续自动重试；读取异常不会显示成已经发布的零条预测，也不会改写历史版本。" : todayAccessMessage}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">{todayPayload?.allowed ? <Link href="/member/daily" className="text-sm font-medium text-violet-200 underline decoration-violet-300/30 underline-offset-4">打开会员日报重试</Link> : <Link href="/login?next=/" className="text-sm font-medium text-violet-200 underline decoration-violet-300/30 underline-offset-4">已有账户？登录查看</Link>}<Link href="/verification" className="text-sm text-white/55 underline decoration-white/20 underline-offset-4">查看历史验证</Link></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {MEMBER_ENTRIES.map((item) => <Link key={item.href} href={item.href} className={`rounded-3xl border p-6 transition hover:-translate-y-0.5 ${item.tone === "violet" ? "border-violet-400/15 bg-[linear-gradient(135deg,rgba(25,17,48,.97),rgba(9,10,17,.98))] hover:border-violet-400/30" : item.tone === "cyan" ? "border-cyan-400/15 bg-[linear-gradient(135deg,rgba(8,38,50,.97),rgba(8,10,17,.98))] hover:border-cyan-400/30" : "border-pink-400/15 bg-[linear-gradient(135deg,rgba(55,20,46,.97),rgba(10,9,16,.98))] hover:border-pink-400/30"}`}>
            <p className={`text-sm tracking-[0.18em] ${item.tone === "violet" ? "text-violet-300/85" : item.tone === "cyan" ? "text-cyan-300/85" : "text-pink-300/85"}`}>{item.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-white/58">{item.body}</p>
          </Link>)}
        </div>
      </section>

      <Suspense fallback={<HomeDesktopVerificationFallback />}>
        <HomeDesktopVerificationData nowIso={now.toISOString()} />
      </Suspense>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-violet-400/20 bg-violet-500/[0.07] p-6 sm:flex-row sm:items-center">
          <div><h2 className="text-2xl font-semibold">从会员频道开始</h2><p className="mt-2 text-sm text-white/58">日报、周走势、月走势、精选研究、缠论数据、量化交易与会员卜卦集中在一个入口。</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/member" className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium">会员频道</Link><Link href="/pricing" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80">查看会员价格</Link></div>
        </div>
      </section>
      </div>
    </>
  );
}

const loadHomeVerification = cache(async (nowIso: string) => {
  const now = new Date(nowIso);
  const payload = await getPublicAccuracyHistory(now);
  return selectVerification(payload.items, now);
});

async function HomeMobileVerificationData({ nowIso }: { nowIso: string }) {
  const verification = await loadHomeVerification(nowIso);
  return (
    <section className="px-4 pb-24 pt-5 md:hidden">
      <div className="flex items-center justify-between"><div><p className="text-[11px] tracking-[0.18em] text-white/35">VERIFICATION</p><h2 className="mt-1 text-lg font-semibold">上一交易日命中案例</h2><p className="mt-1 text-[11px] text-white/35">首页精选；全部结果见公开验证</p></div><Link href="/verification" className="text-xs text-emerald-200">历史 →</Link></div>
      <div className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025]">
        {verification.length ? verification.map(({ item }) => <div key={item.forecastId} className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0"><div><div className="font-medium">{item.assetName}</div><div className="mt-1 text-xs text-white/38">{zhDate(item.forecastDate)} · 预测 {item.predictedDirection} · 实际 {item.actualDirection}</div></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${item.verdict === "PARTIAL_HIT" ? "border-amber-400/25 bg-amber-500/10 text-amber-100" : "border-emerald-400/18 bg-emerald-500/10 text-emerald-200"}`}>{item.verdictLabel}</span></div>) : <div className="p-5 text-sm text-white/40">暂无上一交易日的命中或部分命中记录。</div>}
      </div>
    </section>
  );
}

async function HomeDesktopVerificationData({ nowIso }: { nowIso: string }) {
  const verificationItems = await loadHomeVerification(nowIso);
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(14,25,26,.98),rgba(8,9,14,.98))] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm tracking-[0.18em] text-emerald-300/85">日验证</p><h2 className="mt-2 text-2xl font-semibold">上一交易日命中案例</h2><p className="mt-2 text-sm text-white/48">首页只展示命中与部分命中；未命中与全部样本请查看公开验证。</p></div><Link href="/verification" className="text-sm text-emerald-200">查看全部历史验证 →</Link></div>
        <div className="mt-5 grid gap-3">
          {verificationItems.length ? verificationItems.map(({ item }) => <div key={item.forecastId} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{item.assetName}</div><div className="mt-1 text-sm text-white/48">验证日期 {zhDate(item.forecastDate)}</div><div className="mt-1 text-sm text-white/65">预测 {item.predictedDirection} · 实际 {item.actualDirection}</div></div><span className={`rounded-full border px-3 py-1 text-sm ${item.verdict === "PARTIAL_HIT" ? "border-amber-400/30 bg-amber-500/15 text-amber-100" : "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"}`}>{item.verdictLabel}</span></div></div>) : <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/55">暂无上一交易日的命中或部分命中记录。</div>}
        </div>
      </div>
    </section>
  );
}

function HomeMobileVerificationFallback() {
  return <section className="px-4 pb-24 pt-5 md:hidden"><div className="h-32 animate-pulse rounded-3xl border border-white/8 bg-white/[0.025]" /></section>;
}

function HomeDesktopVerificationFallback() {
  return <section className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 lg:px-8"><div className="h-44 animate-pulse rounded-3xl border border-white/8 bg-white/[0.025]" /></section>;
}

function HomeLandingFallback() {
  return (
    <>
      <div className="md:hidden pb-24">
        <section className="px-4 pt-5">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,.18),transparent_38%),linear-gradient(160deg,#15132a_0%,#090a10_66%)] p-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-violet-300/15" />
            <div className="mt-3 h-7 w-40 animate-pulse rounded-xl bg-white/10" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-[68px] animate-pulse rounded-2xl border border-white/8 bg-white/[0.035]" />)}
            </div>
          </div>
        </section>
        <section className="px-4 pt-4">
          <div className="h-5 w-44 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-3 grid gap-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl border border-white/8 bg-white/[0.025]" />)}
          </div>
        </section>
      </div>
      <div className="hidden md:block">
        <section className="border-b border-white/5 bg-[#090b12]">
          <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
              <div className="h-5 w-36 animate-pulse rounded-lg bg-violet-300/15" />
              <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-white/10" />
              <div className="mt-8 grid gap-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
