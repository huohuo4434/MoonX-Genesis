import Image from "next/image";
import { cryptoRiskNote as note } from "@/content/public-notes/crypto-risk-20260925";

export function CryptoRiskNote20260925() {
  return (
    <article id={`note-${note.id}`} className="scroll-mt-24 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.03] p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">全员可见 · 原图全文公开</span>
        <time dateTime={note.date}>{note.date}</time>
        <span>作者观察 · 不触发交易</span>
      </div>
      <h2 className="mt-4 text-xl font-semibold leading-8"><a href={`#note-${note.id}`}>{note.title}</a></h2>
      <p className="mt-3 leading-8 text-emerald-100">{note.summary}</p>
      <p className="mt-4 text-xs leading-6 text-white/55">{note.provenance}</p>
      <details className="mt-5" open>
        <summary className="cursor-pointer rounded-lg border border-white/15 px-4 py-3 text-sm text-white/80 hover:bg-white/5">展开 / 收起完整分析与两张原图（免费）</summary>
        {note.sections.map((section, index) => {
          const chart = note.images[index];
          return (
          <section key={section.title} className="mt-7">
            <h3 className="text-lg font-semibold leading-8">{section.title}</h3>
            <div className="mt-3 space-y-4 leading-8 text-white/80">
              {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
            {section.sources.length > 0 && <ul aria-label={`${section.title}的资料来源`} className="mt-3 space-y-2 text-xs leading-6 text-white/60">
              {section.sources.map(key => <li key={key}><a href={note.sources[key].url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{note.sources[key].label}</a></li>)}
            </ul>}
            {chart && <figure className="mt-5">
              <a href={chart.path} target="_blank" rel="noopener noreferrer" aria-label={`${chart.asset} 日线原始截图，打开大图`}>
                <Image src={chart.path} alt={chart.caption} width={chart.width} height={chart.height} unoptimized className="h-auto w-full rounded-xl border border-white/10" />
              </a>
              <figcaption className="mt-3 text-xs leading-6 text-white/60">{chart.caption} <a href={chart.path} target="_blank" rel="noopener noreferrer" className="underline">打开原尺寸图</a></figcaption>
            </figure>}
          </section>
          );
        })}
        <p className="mt-7 border-t border-white/10 pt-4 text-xs leading-6 text-white/50">资料核对日期：2026-09-25。外部数据页面可能后续更新，本篇引用的是注明日期的快照；原图未修改。后续观点变化应另发新篇，保留本篇原始判断。</p>
      </details>
    </article>
  );
}
