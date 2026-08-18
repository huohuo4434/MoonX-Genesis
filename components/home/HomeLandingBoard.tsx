import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";
import { displayMarketCode, normalizeFormalDirection } from "@/lib/forecasts/formal-direction";
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

function selectVerification(items: PublicAccuracyHistoryItem[]) {
  const selected: PublicAccuracyHistoryItem[] = [];
  for (const item of [...items.filter((row) => row.verdictLabel === "完全命中"), ...items.filter((row) => row.verdictLabel === "部分命中"), ...items]) {
    if (selected.some((row) => row.forecastId === item.forecastId)) continue;
    selected.push(item);
    if (selected.length === 3) break;
  }
  return selected;
}

const MEMBER_ENTRIES = [
  { href: "/member/daily", eyebrow: "会员日报", title: "今天与下一交易日", body: "方向、关键位、失效条件和当天风险，一页看完。", tone: "violet" },
  { href: "/member/weekly-report", eyebrow: "会员周报", title: "本周机会与风险", body: "只保留最值得跟踪的机会、主要风险和行动清单。", tone: "cyan" },
  { href: "/member/ai-trading", eyebrow: "量化交易", title: "计划、持仓与风控", body: "查看量化计划、执行状态、保护单与风险闸门。", tone: "pink" },
] as const;

export async function HomeLandingBoard() {
  noStore();
  const now = new Date();
  const [todayResult, verificationResult] = await Promise.allSettled([
    getTodayForecastAccessPayload(now),
    getPublicAccuracyHistory(now),
  ]);
  const todayPayload = todayResult.status === "fulfilled" ? todayResult.value : null;
  const todayForecasts = todayPayload?.allowed ? todayPayload.forecasts : [];
  const marketRows = buildMarketRows(todayForecasts);
  const verificationItems = verificationResult.status === "fulfilled" ? selectVerification(verificationResult.value.items) : [];
  const todayAccessMessage = todayPayload && !todayPayload.allowed ? todayPayload.message : "今日观点正在整理中";

  return (
    <main className="min-h-screen bg-[#06070b] text-white">
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
                      return <tr key={symbol} className="bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                        <td className="rounded-l-2xl px-3 py-3"><div className="font-medium">{name}</div><div className="mt-1 text-xs text-white/42">{symbol}</div></td>
                        <td className="px-3 py-3">{direction ? <><span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${directionClass(direction)}`}>{direction}</span>{forecast?.qimenMysticNote ? <p className="mt-2 max-w-[320px] text-xs leading-5 text-violet-100/64"><span className="mr-1 font-medium text-violet-300/90">盘语</span>{forecast.qimenMysticNote}</p> : null}</> : <span className="text-sm text-white/45">待发布</span>}</td>
                        <td className="px-3 py-3">{confidence ? <><span className="font-mono text-base tracking-[0.16em] text-amber-200">{starsText(confidence)}</span>{forecast?.qimenAgreementLabel ? <div className="mt-1 text-[11px] text-white/42">{forecast.qimenAgreementLabel}</div> : null}</> : <span className="text-white/35">—</span>}</td>
                        <td className="px-3 py-3 text-sm text-white/74">{forecast ? firstLevel(forecast.supportLevels) : "—"}</td>
                        <td className="px-3 py-3 text-sm text-white/74">{forecast ? firstLevel(forecast.resistanceLevels) : "—"}</td>
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
            <p className="mt-4 text-xs leading-6 text-white/42">星级表示方法一致程度；详细依据进入会员报告查看。</p>
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
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm tracking-[0.18em] text-emerald-300/85">最近验证</p><h2 className="mt-2 text-2xl font-semibold">预测结果公开留档</h2></div><Link href="/verification" className="text-sm text-emerald-200">查看全部历史验证 →</Link></div>
          <div className="mt-5 grid gap-3">
            {verificationItems.length ? verificationItems.map((item) => <div key={item.forecastId} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{item.assetName}</div><div className="mt-1 text-sm text-white/48">预测日期 {zhDate(item.forecastDate)}</div><div className="mt-1 text-sm text-white/65">预测 {item.predictedDirection} · 实际 {item.actualDirection}</div></div><span className={`rounded-full border px-3 py-1 text-sm ${item.verdictLabel === "完全命中" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-amber-400/30 bg-amber-500/15 text-amber-100"}`}>{item.verdictLabel}</span></div></div>) : <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/55">暂无可展示的已验证记录。</div>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-violet-400/20 bg-violet-500/[0.07] p-6 sm:flex-row sm:items-center">
          <div><h2 className="text-2xl font-semibold">从会员频道开始</h2><p className="mt-2 text-sm text-white/58">日报、周走势、月走势、精选研究、缠论数据、量化交易与会员卜卦集中在一个入口。</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/member" className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-medium">会员频道</Link><Link href="/pricing" className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80">查看会员价格</Link></div>
        </div>
      </section>
    </main>
  );
}
