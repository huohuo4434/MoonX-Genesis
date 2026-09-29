import Image from "next/image";
import { twoWeekNote as note, scenarioAssets } from "@/content/public-notes/two-week-scenarios-20260929";

export function TwoWeekScenarios20260929({ en = false }: { en?: boolean }) {
  const copy = en ? note.en : note.zh;
  const labels = en ? ["Source view", "Observed structure", "Rest of this week", "Next-week conditions", "Invalidation / cautions"] : ["原文判断", "当前结构", "本周剩余时段", "下周条件", "失效与边界"];
  return <article id={`note-${note.id}`} lang={en ? "en" : "zh-CN"} className="scroll-mt-24 rounded-2xl border border-amber-300/30 bg-white/[.03] p-5 sm:p-7">
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/60"><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">{en ? "Public · 9 scenario charts" : "全员可见 · 9张模拟K线图"}</span><time dateTime={note.date}>{note.date}</time><a className="underline" href={`${en ? "" : "/en"}/member/notes#note-${note.id}`}>{en ? "中文版" : "English"}</a></div>
    <h2 className="mt-4 text-2xl font-semibold leading-snug">{copy.title}</h2>
    <p className="mt-4 leading-8 text-emerald-100">{copy.summary}</p>
    <p className="mt-3 text-xs leading-6 text-white/60">{copy.provenance}</p>
    <div className="mt-5 space-y-3 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-7 text-amber-100"><p>{copy.method}</p><p>{copy.timing}</p></div>
    <p className="mt-5 text-sm leading-7 text-white/75">{copy.integrity}</p>
    <nav aria-label={en ? "Nine markets" : "九类资产"} className="mt-5 flex flex-wrap gap-3 text-sm text-emerald-200">{scenarioAssets.map(asset => <a key={asset.id} href={`#scenario-${asset.id}-20260929`} className="underline">{asset.name[en?1:0]}</a>)}</nav>
    {scenarioAssets.map(asset => {
      const paragraphs = en ? asset.en : asset.zh;
      const path = `/images/public-notes/20260929/${asset.id}-${en?"en":"zh"}.svg`;
      return <section id={`scenario-${asset.id}-20260929`} key={asset.id} className="mt-9 scroll-mt-24 border-t border-white/10 pt-6">
        <h3 className="text-xl font-semibold">{asset.name[en?1:0]}</h3>
        <figure className="mt-4"><a href={path} target="_blank" rel="noopener noreferrer" aria-label={en ? `Open ${asset.id} scenario chart at full size` : `打开${asset.name[0]}模拟图大图`}><Image src={path} width={1240} height={800} unoptimized alt={`${asset.name[en?1:0]} — ${en ? "filled historical candles; hollow synthetic scenario candles, not future OHLC forecasts" : "实心历史K线、空心模拟K线；非精确未来四价预测"}`} className="h-auto w-full rounded-xl border border-white/10" /></a><figcaption className="mt-2 text-xs leading-6 text-amber-100/80">{en ? "Tap to enlarge. All candles after the boundary are constructed illustrations. Exact dates and prices are not predictions." : "点击放大。分界线之后全部为人工构造的示意，具体日期、影线与收盘价不是预测承诺。"}</figcaption></figure>
        <dl className="mt-4 space-y-3">{paragraphs.map((paragraph,i) => <div key={labels[i]}><dt className="text-sm font-semibold text-emerald-200">{labels[i]}</dt><dd className="mt-1 text-sm leading-7 text-white/80">{paragraph}</dd></div>)}</dl>
        <p className="mt-3 text-xs text-white/55"><a className="underline" href={asset.source} target="_blank" rel="noopener noreferrer">{en ? "Historical daily data source (dated snapshot; not an auto-updating chart)" : "历史日线数据来源（本文为定时点快照，不自动更新）"}</a></p>
      </section>;
    })}
    <p className="mt-7 text-sm leading-7 text-white/70">{copy.tail}</p>
    <details className="mt-5 text-xs leading-7 text-white/60"><summary className="cursor-pointer underline">{en ? "Source trace and trading calendars" : "原文定位与交易日历"}</summary><ul className="mt-3 list-disc space-y-2 pl-5"><li><a className="underline" href="https://www.youtube.com/watch?v=S6D1oUJ7Qbc" target="_blank" rel="noopener noreferrer">{en ? "External transcript: Sep 28–Oct 3" : "外部研究原始视频：9/28—10/3"}</a>{en ? " · US/semis 09:04–13:05; China/HK 13:07–15:13; BTC/ETH/gold 15:15–17:35; BTC prior-error review 01:52–02:10." : " · 美股/半导体09:04—13:05；A股/港股13:07—15:13；BTC/ETH/黄金15:15—17:35；BTC前期失误复盘01:52—02:10。"}</li><li><a className="underline" href="https://www.youtube.com/watch?v=p3P7mKpUIgU" target="_blank" rel="noopener noreferrer">{en ? "External transcript: Oct 5–10" : "外部研究原始视频：10/5—10/10"}</a>{en ? " · Equities 02:42–05:30; BTC 05:33–08:21; ETH 08:23–09:20; gold 09:22–10:20. Recorded early; not a completed review of the first week." : " · 股票02:42—05:30；BTC 05:33—08:21；ETH 08:23—09:20；黄金09:22—10:20。该期提前录制，不是对第一周结果的完整复盘。"}</li><li><a className="underline" href="https://www.sse.com.cn/disclosure/dealinstruc/closed/c/c_20251222_10802510.shtml" target="_blank" rel="noopener noreferrer">{en ? "SSE 2026 holiday calendar" : "上交所2026休市安排"}</a>{" · "}<a className="underline" href="https://www.hkex.com.hk/-/media/HKEX-Market/Mutual-Market/Stock-Connect/Reference-Materials/Trading-Hour%2C-Trading-and-Settlement-Calendar/2026-Calendar_pdf_e.pdf" target="_blank" rel="noopener noreferrer">{en ? "HKEX trading calendar" : "港交所交易日历"}</a></li></ul></details>
    <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-7 text-white/60">{copy.disclaimer}</p>
  </article>;
}
