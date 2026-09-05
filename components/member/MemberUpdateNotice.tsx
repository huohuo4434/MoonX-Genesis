import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";
import type { MemberUpdateNote } from "@/lib/member-updates/catalog";

export function MemberUpdateNotice({ note, compact = false, locale = "zh-CN" }: { note: MemberUpdateNote; compact?: boolean; locale?: Locale }) {
  const en = locale === "en";
  const content = en ? note.english ?? { title: "Member update", summary: "View release details and navigation changes.", highlights: [] } : note;
  return (
    <section aria-label={en ? "Latest member update" : "最新版本升级公告"} className="rounded-3xl border border-amber-300/20 bg-[linear-gradient(145deg,rgba(251,191,36,.09),rgba(255,255,255,.025))] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-amber-200">
        <span className="rounded-full bg-amber-300/10 px-3 py-1">{en ? "Latest update" : "最新改版"} · {note.version}</span>
        <time dateTime={note.releasedAt} className="text-white/45">{note.releasedAt}</time>
      </div>
      <div className={compact ? "mt-3" : "mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"}>
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{content.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">{content.summary}</p>
          {!compact ? (
            <ul className="mt-4 grid gap-2 text-sm text-white/75 md:grid-cols-2">
              {content.highlights.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          ) : null}
        </div>
        <Link href={localizeHref("/member/updates", locale)} className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-amber-200/30 px-5 text-sm font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-200/10 lg:mt-0">
          {en ? "Release notes and navigation changes →" : "查看改版内容与入口变化 →"}
        </Link>
      </div>
    </section>
  );
}
