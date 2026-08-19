// MOOX_V7206_VERIFICATION_RANKING
// MOOX_V72052_HOME_FRESH
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { displayMarketCode, normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
import { isHumanPublishedForecast } from "@/lib/data/daily-forecasts";
import type { DailyForecast } from "@/types/daily-forecast";
import type { PublicAccuracyHistoryItem } from "@/lib/accuracy/get-public-history";
import { buildHomeResearchReason, cleanDailyLevel } from "@/lib/forecasts/daily-display-reason";
import { HomeMobileAppView } from "@/components/home/HomeMobileAppView";
import { getPublicUnifiedLiveSnapshot } from "@/lib/trading-signals/unified-live-public";

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

type VerificationSelection = { item: PublicAccuracyHistoryItem; weightedRate: number; samples: number };

function verificationPoints(item: PublicAccuracyHistoryItem): number | null {
  if (item.verdict === "FULL_HIT" || item.verdict === "HIT") return 1;
  if (item.verdict === "PARTIAL_HIT") return 0.5;
  if (item.verdict === "MISS") return 0;
  return null;
}

function selectVerification(items: PublicAccuracyHistoryItem[], now = new Date()) {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const deduped: PublicAccuracyHistoryItem[] = [];
  const seen = new Set<string>();
  for (const item of [...items].sort((a, b) => String(b.verifiedAt).localeCompare(String(a.verifiedAt)))) {
    const symbol = canonicalSymbol(item.symbol);
    if (!CORE_MARKETS.some((market) => market.symbol === symbol)) continue;
    const key = `${symbol}|${item.forecastDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const stats = new Map<string, { samples: number; points: number; latest: string }>();
  for (const item of deduped) {
    const verifiedMs = Date.parse(item.verifiedAt);
    if (!Number.isFinite(verifiedMs) || verifiedMs < cutoff) continue;
    const points = verificationPoints(item);
    if (points == null) continue;
    const symbol = canonicalSymbol(item.symbol);
    const row = stats.get(symbol) ?? { samples: 0, points: 0, latest: "" };
    row.samples += 1;
    row.points += points;
    row.latest = row.latest > item.verifiedAt ? row.latest : item.verifiedAt;
    stats.set(symbol, row);
  }

  const rankedSymbols = [...stats.entries()]
    .map(([symbol, row]) => ({
      symbol,
      ...row,
      weightedRate: row.samples ? row.points / row.samples : 0,
      // Small-sample correction prevents a single lucky 1/1 market from always ranking first.
      rankScore: (row.points + 1) / (row.samples + 2),
    }))
    .sort((a, b) => b.rankScore - a.rankScore || b.weightedRate - a.weightedRate || b.samples - a.samples || b.latest.localeCompare(a.latest))
    .slice(0, 3);

  const selected: VerificationSelection[] = [];
  for (const ranked of rankedSymbols) {
    const latest = deduped.find((item) => canonicalSymbol(item.symbol) === ranked.symbol);
    if (latest) selected.push({ item: latest, weightedRate: ranked.weightedRate, samples: ranked.samples });
  }

  if (selected.length >= 3) return selected;
  for (const item of deduped) {
    const symbol = canonicalSymbol(item.symbol);
    if (selected.some((current) => canonicalSymbol(current.item.symbol) === symbol)) continue;
    const row = stats.get(symbol);
    selected.push({ item, weightedRate: row && row.samples ? row.points / row.samples : 0, samples: row?.samples ?? 0 });
    if (selected.length === 3) break;
  }
  return selected;
}

const MEMBER_ENTRIES = [
  { href: "/member/daily", eyebrow: "会员日报", title: "今天与下一交易日", body: "方向、关键位、失效条件和当天风险，一页看完。", tone: "violet" },
  { href: "/member/weekly-report", eyebrow: "会员周报", title: "本周机会与风险", body: "只保留最值得跟踪的机会、主要风险和行动清单。", tone: "cyan" },
  { href: "/member/ai-trading", eyebrow: "AI交易研究", title: "计划、持仓与盈亏", body: "查看研究计划、管理员账户持仓和每单已实现盈亏。", tone: "pink" },
] as const;

export async function HomeLandingBoard() {
  noStore();
  const now = new Date();
  const [todayResult, verificationResult, liveResult] = await Promise.allSettled([
    getTodayForecastAccessPayload(now),
    getPublicAccuracyHistory(now),
    getPublicUnifiedLiveSnapshot(),
  ]);
  const todayPayload = todayResult.status === "fulfilled" ? todayResult.value : null;
  const todayForecasts = todayPayload?.allowed ? todayPayload.forecasts : [];
  const marketRows = buildMarketRows(todayForecasts);
  const verificationItems = verificationResult.status === "fulfilled" ? selectVerification(verificationResult.value.items, now) : [];
  const todayAccessMessage = todayPayload && !todayPayload.allowed ? todayPayload.message : "今日观点正在整理中";
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
        reason: buildHomeResearchReason(forecast),
        resonanceRank,
      };
    })
    .sort((a, b) => b.resonanceRank - a.resonanceRank || b.confidenceStars - a.confidenceStars || a.symbol.localeCompare(b.symbol))
    .slice(0, 3)
    .map(({ resonanceRank: _resonanceRank, ...row }) => row);
  const resonanceCount = publishedRows.filter((row) => /共振/u.test(row.forecast?.qimenAgreementLabel ?? "")).length;
  const divergenceCount = publishedRows.filter((row) => /分歧/u.test(row.forecast?.qimenAgreementLabel ?? "")).length;
  const livePublicReadable = liveResult.status === "fulfilled";
  const openOfficialPositions = liveResult.status === "fulfilled"
    ? liveResult.value.positions.filter((row) => !["CLOSED", "CANCELLED"].includes(String(row.status).toUpperCase())).length
    : 0;
  const mobileVerification = verificationItems.map(({ item }) => ({
    id: item.forecastId,
    assetName: item.assetName,
    date: zhDate(item.forecastDate),
    predicted: item.predictedDirection,
    actual: item.actualDirection,
    verdict: item.verdictLabel,
  }));

  return (
    <main className="min-h-screen bg-[#06070b] text-white">
      <HomeMobileAppView
        canViewDaily={Boolean(todayPayload?.allowed)}
        accessMessage={todayAccessMessage}
        markets={mobileMarkets}
        resonanceCount={resonanceCount}
        divergenceCount={divergenceCount}
        publishedCount={publishedRows.length}
        livePublicReadable={livePublicReadable}
        openOfficialPositions={openOfficialPositions}
        verification={mobileVerification}
      />
      <div className="hidden md:block">
      <section id="daily-board" className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,190,210,0.13),transparent_28%),linear-gradient(180deg,#0d1020_0%,#06070b_100%)]">
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-sm font-medium tracking-[0.2em] text-violet-300">MOOX DAILY BOARD</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">九大市场今日预测</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">看清方向，等待位置，严格执行。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/member" className="rounded-full border border-violet-400/35 bg-violet-500/18 px-5 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/28">进入会员频道</Link>
                <Link href="/verification" className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20">历史验证</Link>
              </div>
            </div>

            {todayPayload?.allowed ? (
              <div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                <table className="min-w-full border-separate border-spacing-y-2 text-left">
                  <thead><tr className="text-xs tracking-[0.16em] text-white/42"><th className="px-3 py-2">市场</th><th className="px-3 py-2">今日预测</th><th className="px-3 py-2">信心</th><th className="px-3 py-2">关键支撑</th><th className="px-3 py-2">关键压力</th><th className="px-3 py-2">更新</th></tr></thead>
                  <tbody>
                    {marketRows.map(({ symbol, name, forecast }) => {
                      const direction = forecast ? homeDirection(forecast) : null;
                      const confidence = forecast ? confidenceStars(forecast) : null;
                      const researchReason = forecast ? buildHomeResearchReason(forecast) : "";
                      return <tr key={symbol} className="bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                        <td className="rounded-l-2xl px-3 py-3"><div className="font-medium">{name}</div><div className="mt-1 text-xs text-white/42">{symbol}</div></td>
                        <td className="px-3 py-3">{direction ? <><span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${directionClass(direction)}`}>{direction}</span>{researchReason ? <p className="mt-2 max-w-[360px] text-xs leading-5 text-white/58">{researchReason}</p> : null}</> : <span className="text-sm text-white/45">待发布</span>}</td>
                        <td className="px-3 py-3">{confidence ? <><span className="font-mono text-base tracking-[0.16em] text-amber-200">{starsText(confidence)}</span>{forecast?.qimenAgreementLabel ? <div className="mt-1 text-[11px] text-white/42">{forecast.qimenAgreementLabel}</div> : null}</> : <span className="text-white/35">—</span>}</td>
                        <td className="px-3 py-3 text-sm text-white/74">{forecast ? cleanDailyLevel(forecast.supportLevels?.[0]) : "—"}</td>
                        <td className="px-3 py-3 text-sm text-white/74">{forecast ? cleanDailyLevel(forecast.resistanceLevels?.[0]) : "—"}</td>
                        <td className="rounded-r-2xl px-3 py-3 text-xs text-white/42">{forecast ? zhDateTime(forecast.updatedAt || forecast.publishedAt) : "—"}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-5">
                <div className="text-lg font-medium">登录后查看九大市场完整日度表</div>
                <p className="mt-2 text-sm leading-6 text-white/58">{todayAccessMessage}</p>
                <div className="mt-4 flex flex-wrap gap-3"><Link href="/login?next=/" className="rounded-full bg-violet-500 px-5 py-2 text-sm font-medium text-white">登录查看</Link><Link href="/pricing" className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white/80">会员价格</Link></div>
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

      <section className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(14,25,26,.98),rgba(8,9,14,.98))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm tracking-[0.18em] text-emerald-300/85">验证精选</p><h2 className="mt-2 text-2xl font-semibold">九大市场近期表现较稳的3个市场</h2></div><Link href="/verification" className="text-sm text-emerald-200">查看全部历史验证 →</Link></div>
          <div className="mt-5 grid gap-3">
            {verificationItems.length ? verificationItems.map(({ item, weightedRate, samples }) => <div key={item.forecastId} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{item.assetName}</div><div className="mt-1 text-sm text-white/48">近30天加权命中 {samples ? `${Math.round(weightedRate * 100)}% · ${samples}个有效样本` : "样本积累中"}</div><div className="mt-1 text-sm text-white/48">最近验证 {zhDate(item.forecastDate)}</div><div className="mt-1 text-sm text-white/65">预测 {item.predictedDirection} · 实际 {item.actualDirection}</div></div><span className={`rounded-full border px-3 py-1 text-sm ${item.verdictLabel === "完全命中" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-amber-400/30 bg-amber-500/15 text-amber-100"}`}>{item.verdictLabel}</span></div></div>) : <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/55">暂无可展示的已验证记录。</div>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-violet-400/20 bg-violet-500/[0.07] p-6 sm:flex-row sm:items-center">
          <div><h2 className="text-2xl font-semibold">从会员频道开始</h2><p className="mt-2 text-sm text-white/58">日报、周走势、月走势、精选研究、缠论数据、量化交易与会员卜卦集中在一个入口。</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/member" className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium">会员频道</Link><Link href="/pricing" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80">查看会员价格</Link></div>
        </div>
      </section>
      </div>
    </main>
  );
}
