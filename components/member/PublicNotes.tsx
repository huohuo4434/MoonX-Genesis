import Image from "next/image";
import { publicNotes } from "@/content/public-notes/market-tao-20260919";
import { CryptoRiskNote20260925 } from "./CryptoRiskNote20260925";

export function PublicNotes() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10" aria-labelledby="public-notes-heading">
      <p className="text-xs tracking-widest text-emerald-400">MOOX · 公开研究</p>
      <h1 id="public-notes-heading" className="mt-2 text-3xl font-semibold">易老师随笔</h1>
      <p className="mt-3 text-sm leading-7 text-white/65">这里的公开图文无需付费或登录，包含作者最新随笔及 MarketTao 原帖的中文整理。每篇保留自己的日期、来源与条件，不是实时行情，也不会自动覆盖正式预测或触发交易。</p>
      <nav aria-label="公开随笔目录" className="mt-5 flex flex-wrap gap-2">
        <a href="#note-btc-eth-risk-20260925" className="rounded-full border border-emerald-400/40 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-400">9/25 BTC · ETH 风险观察</a>
        {publicNotes.map(note => <a key={note.id} href={`#note-${note.id}`} className="rounded-full border border-white/15 px-3 py-2 text-sm hover:border-emerald-400">{note.asset}</a>)}
      </nav>
      <div className="mt-8 space-y-6">
        <CryptoRiskNote20260925 />
        {publicNotes.map(note => (
          <article id={`note-${note.id}`} key={note.id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">全员可见 · 全文公开</span>
              <span>原帖 <time dateTime={note.date}>{note.date}</time> · 中文整理 2026-09-19</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold leading-8"><a href={`#note-${note.id}`}>{note.title}</a></h2>
            <p className="mt-3 leading-7 text-emerald-100">{note.summary}</p>
            <details className="group mt-4" open={note.id === "btc-20260919"}>
              <summary className="cursor-pointer rounded-lg border border-white/10 px-4 py-3 text-sm text-white/80 hover:bg-white/5">展开 / 收起中文全文与配图（免费）</summary>
              <div className="mt-5 space-y-4 leading-8 text-white/80">
                {note.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>
              {note.image ? <figure className="mt-6">
                <a href={`/images/public-notes/20260919/${note.image}-zh.webp`} target="_blank" rel="noopener noreferrer" aria-label={`${note.asset}中文配图，打开大图`}>
                  <Image src={`/images/public-notes/20260919/${note.image}-zh.webp`} alt={`${note.title}。AI辅助情景示意，关键条件及价格见本篇正文。`} width={1122} height={1402} unoptimized className="h-auto w-full rounded-xl border border-white/10" />
                </a>
                <figcaption className="mt-2 text-xs leading-6 text-white/50">中文配图为原帖AI图的本地化情景示意，不是已核验历史K线或实时行情。阅读点位以正文为准。<a className="ml-2 underline" href={`/images/public-notes/20260919/${note.image}-original.jpg`} target="_blank" rel="noopener noreferrer">查看英文原图</a></figcaption>
              </figure> : null}
              <p className="mt-5 text-xs text-white/50"><a href={note.source} target="_blank" rel="noopener noreferrer" className="underline">查看本人 X 原帖与回复链</a> · 个人研究，不构成收益保证。</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
