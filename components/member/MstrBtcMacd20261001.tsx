import Image from "next/image";
import { macdView as note } from "@/content/public-notes/mstr-btc-macd-20261001";

export function MstrBtcMacd20261001({ en = false }: { en?: boolean }) {
  const copy = en ? note.en : note.zh;
  const locale = en ? "en" : "zh";
  const figures = [
    ...note.originals.map(image => ({ path: `/images/public-notes/20261001/${image.file}`, width: image.width, height: image.height })),
    ...["structure", "mstr", "btc"].map(id => ({ path: `/images/public-notes/20261001/${id}-${locale}.svg`, width: 1240, height: 800 })),
  ];
  function figure(index: 0 | 1 | 2 | 3 | 4) {
    const image = figures[index];
    if (!image) throw new Error("MACD view figure is missing");
    return <figure className="mt-5"><a href={image.path} target="_blank" rel="noopener noreferrer" aria-label={copy.chartCaptions[index]}><Image src={image.path} width={image.width} height={image.height} unoptimized alt={copy.chartCaptions[index]} className="h-auto w-full rounded-xl border border-white/15" /></a><figcaption className="mt-2 text-xs leading-6 text-white/60">{copy.chartCaptions[index]}</figcaption></figure>;
  }
  return <article id={`note-${note.id}`} lang={en ? "en" : "zh-CN"} className="scroll-mt-24 rounded-2xl border border-emerald-300/30 bg-white/[.03] p-5 sm:p-7">
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/60"><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">{en ? "Teacher Yi’s Views · Public" : "易老师观点 · 全员可见"}</span><time dateTime={note.date}>{note.date}</time><a className="underline" href={`${en ? "" : "/en"}/member/notes#note-${note.id}`}>{en ? "中文版" : "English"}</a></div>
    <h2 className="mt-4 text-2xl font-semibold leading-snug">{copy.title}</h2>
    <p className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/5 p-4 leading-8 text-emerald-100">{copy.summary}</p>
    <p className="mt-3 text-xs leading-6 text-white/60">{copy.provenance}</p>
    {copy.sections.map((section, index) => <section key={section.heading} className="mt-7 border-t border-white/10 pt-6"><h3 className="text-xl font-semibold leading-8">{section.heading}</h3><div className="mt-3 space-y-3 text-sm leading-8 text-white/80">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>{index === 0 && figure(0)}{index === 1 && figure(1)}{index === 2 && figure(2)}{index === 4 && <>{figure(3)}{figure(4)}</>}</section>)}
    <section className="mt-7 border-t border-white/10 pt-5"><h3 className="text-sm font-semibold text-white/70">{en ? "Indicator references · checked October 1, 2026" : "指标参考资料 · 2026年10月1日查阅"}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-6 text-emerald-200">{note.sources.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></section>
    <p className="mt-5 text-xs leading-7 text-white/55">{copy.disclaimer}</p>
  </article>;
}
