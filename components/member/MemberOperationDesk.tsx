"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localizeHref } from "@/lib/i18n/config";
import type { DailyProjectionData } from "@/lib/research/daily-candle-projection-core";
import { ConciseTradePlans } from "./ConciseTradePlans";

const DailyCandleChart = dynamic(() => import("./DailyCandleChart").then(m => m.DailyCandleChart), { ssr: false });
// These are related instruments, NOT interchangeable price feeds. Keep the exact
// plan symbol visible; never overlay a derivative's orders onto the cash chart.
const ASSETS = [
  ["btc", "BTC", "BTCUSDT"], ["eth", "ETH", "ETHUSDT"], ["sol", "SOL", "SOLUSDT"], ["hype", "HYPE", "HYPEUSDT"],
  ["sandisk", "SNDK", "SNDKUSDT"], ["mu", "MU", "MUUSDT"], ["nvda", "NVDA", "NVDAUSDT"],
  ["tsla", "TSLA", "TSLAUSDT"], ["googl", "GOOGL", "GOOGLUSDT"], ["msft", "MSFT", "MSFTUSDT"],
  ["aapl", "AAPL", "AAPLUSDT"], ["amzn", "AMZN", "AMZNUSDT"], ["meta", "META", "METAUSDT"],
  ["nbis", "NBIS", "NBISUSDT"], ["intel", "INTC", "INTCUSDT"], ["lite", "LITE", "LITEUSDT"],
  ["tencent", "0700.HK", "TENCENTUSDT"], ["gold", "Gold / 黄金", "XAUTUSDT"], ["silver", "Silver / 白银", "XAGUSDT"],
  ["spcx", "SPCX", "NO_VERIFIED_PLAN_SPCX"], ["asteroid", "ASTEROID", "NO_VERIFIED_PLAN_ASTEROID"],
] as const;

export function MemberOperationDesk() {
  const { locale } = useLocale();
  const en = locale === "en";
  const [asset, setAsset] = useState<string>("btc");
  const [request, setRequest] = useState(0);
  const [state, setState] = useState<{ asset: string; data?: DailyProjectionData; failed?: boolean } | null>(null);
  const selected = ASSETS.find(([id]) => id === asset)!;
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setRequest(n => n + 1); }, 300_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    const timeout = window.setTimeout(() => { controller.abort(); setState({ asset, failed: true }); }, 35_000);
    void fetch(`/api/member/key-date-chart?asset=${encodeURIComponent(asset)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as DailyProjectionData;
        if (data.assetId !== asset || !Array.isArray(data.bars) || !data.bars.length) throw new Error("unavailable");
        if (!controller.signal.aborted) setState({ asset, data });
      }).catch(() => { if (!controller.signal.aborted) setState({ asset, failed: true }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [asset, request]);
  const data = state?.asset === asset ? state.data : undefined;
  return <main className="mx-auto max-w-7xl px-4 py-8 text-slate-100" data-operation-desk="v1">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">{en ? "Trading plan" : "操作台"}</h1><p className="mt-1 text-sm text-slate-400">{en ? "One asset. Three horizons. Clear price levels." : "一个标的，长中短线，一张图看清位置。"}</p></div>
      <label className="flex items-center gap-3">{en ? "Asset" : "选择标的"}<select aria-label={en ? "Asset" : "选择标的"} value={asset} onChange={event => setAsset(event.target.value)} className="rounded-xl border border-cyan-300/40 bg-slate-950 p-3">{ASSETS.map(([id, label]) => <option key={id} value={id}>{en ? label.split(" / ")[0] : label}</option>)}</select></label>
    </div>
    <ConciseTradePlans symbol={selected[2]} />
    <section id="price-time-chart" className="rounded-2xl border border-white/10 bg-[#0b1018] p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{selected[1].split(" / ")[0]} · {en ? "Candles & levels" : "K线与关键价位"}</h2><button type="button" onClick={() => setRequest(n => n + 1)} className="rounded-lg border border-white/20 px-3 py-2 text-sm">{en ? "Refresh chart" : "刷新图表"}</button></div>
      <p className="mt-2 text-xs text-amber-100">{en ? "Chart = reference market daily candles; plan = its named contract. Different venues and spot/futures prices are not interchangeable. A support/resistance line is not an order." : "图表为参考市场日K，计划以卡片所列合约为准；现货、期货及不同交易所价格不能混用。支撑压力线不是下单指令。"}</p>
      {data ? <DailyCandleChart key={asset} data={data} en={en} compact /> : <p role="status" className="py-10 text-slate-400">{state?.failed ? (en ? "Price feed unavailable. Retry; no substitute candles are shown." : "行情暂时不可用，请重试；不显示替代K线。") : (en ? "Loading closed daily candles…" : "读取已闭合日K…")}</p>}
    </section>
    <nav aria-label={en ? "Member content" : "会员内容"} className="mt-6 flex flex-wrap gap-3 text-sm">{[
      ["/member/notes", "随笔", "Notes"], ["/member/videos", "会员视频", "Videos"],
      ["/member/weekly-review", "复盘", "Review"], ["/member/ai-trading", "AI执行状态", "AI execution"],
      ["/member/consultations", "会员服务", "Services"],
    ].map(([href, zh, english]) => <Link key={href} className="rounded-lg border border-white/15 px-4 py-2" href={localizeHref(href!, locale)}>{en ? english : zh}</Link>)}</nav>
    <details className="mt-6 text-sm text-slate-400"><summary className="cursor-pointer">{en ? "Research archive" : "研究档案"}</summary><div className="mt-3 flex flex-wrap gap-4">{[
      ["/member/daily?research=1", "每日记录", "Daily records"], ["/member/key-dates?research=1", "关键日记录", "Timing records"],
      ["/member/sector-resonance?detail=1", "板块研究", "Sector research"], ["/member/weekly-report", "周期研究", "Cycle research"],
    ].map(([href, zh, english]) => <Link key={href} href={localizeHref(href!, locale)}>{en ? english : zh}</Link>)}</div></details>
  </main>;
}
