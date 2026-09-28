import Image from "next/image";
import { mstrPathNote as note } from "@/content/public-notes/mstr-path-20260928";

export function MstrPathNote20260928({ en = false }: { en?: boolean }) {
  const copy = en ? note.en : note.zh;
  return (
    <article id={`note-${note.id}`} lang={en ? "en" : "zh-CN"} className="scroll-mt-24 rounded-2xl border border-emerald-400/30 bg-white/[0.03] p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">{en ? "Public · Original charts included" : "全员可见 · 原图全文公开"}</span>
        <time dateTime={note.date}>{note.date}</time>
        <a className="underline" href={`${en ? "" : "/en"}/member/notes#note-${note.id}`}>{en ? "中文版" : "English"}</a>
      </div>
      <h2 className="mt-4 text-2xl font-semibold leading-snug"><a href={`#note-${note.id}`}>{copy.title}</a></h2>
      <p className="mt-4 leading-8 text-emerald-100">{copy.summary}</p>
      <p className="mt-3 text-xs leading-6 text-white/55">{copy.provenance}</p>
      <details open className="mt-5">
        <summary className="cursor-pointer rounded-lg border border-white/15 px-4 py-3 text-sm">{en ? "Read / collapse the full analysis and original charts" : "展开 / 收起完整分析与原图"}</summary>
        <ol aria-label={en ? "Conditional scenario stages" : "条件情景路径"} className="mt-5 grid gap-3 sm:grid-cols-2">
          {copy.steps.map(step => <li key={step} className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100">{step}</li>)}
        </ol>
        <p className="mt-2 text-xs leading-6 text-white/55">{copy.stepNote}</p>
        {copy.sections.map((section, index) => {
          const image = note.images[index];
          const caption = copy.captions[index];
          return <section key={section.title} className="mt-7">
          <h3 className="text-lg font-semibold leading-7">{section.title}</h3>
          {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-3 leading-8 text-white/80">{paragraph}</p>)}
          {image && caption && <figure className="mt-5">
            <a href={image.path} target="_blank" rel="noopener noreferrer" aria-label={en ? `Open original chart ${index + 1}` : `打开第${index + 1}张原图`}>
              <Image src={image.path} width={image.width} height={image.height} unoptimized alt={caption} className="h-auto w-full rounded-xl border border-white/15" />
            </a>
            <figcaption className="mt-2 text-xs leading-6 text-white/60">{caption} <a href={image.path} target="_blank" rel="noopener noreferrer" className="underline">{en ? "Full-size original" : "原尺寸查看"}</a></figcaption>
          </figure>}
        </section>;
        })}
        <p className="mt-6 rounded-xl bg-emerald-400/5 p-4 leading-8 text-emerald-100">{copy.conclusion}</p>
        <p className="mt-5 text-xs leading-6 text-white/55"><a href={note.source} target="_blank" rel="noopener noreferrer" className="underline">{en ? "Corporate-action reference: official 2024 stock-split announcement" : "公司行动参考：2024年官方拆股公告"}</a>{en ? " — supports the adjustment caution, not this price scenario." : "——仅用于说明历史价格口径，不为本篇价格预判背书。"}</p>
        <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-6 text-white/55">{copy.disclaimer}</p>
      </details>
    </article>
  );
}
