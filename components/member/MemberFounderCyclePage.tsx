import type { MemberFounderCyclePack } from "@/types/member-founder-cycle";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_EN,PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_INTERPRETATION_LABEL_ZH,projectPublicAttribution,publicAttributionText } from "@/lib/presentation/public-attribution";

const pick = (value: { zh: string; en: string }, en: boolean) => en ? value.en : value.zh;

export function MemberFounderCyclePage({ pack: rawPack, locale }: { pack: MemberFounderCyclePack; locale: "zh" | "en" }) {
  const en = locale === "en";
  const pack = projectPublicAttribution(rawPack, { locale });
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-zinc-100">
      <header className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] to-violet-400/[0.05] p-6 sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">MOOX · RESEARCH ONLY</div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{pick(pack.title, en)}</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">
          {en ? PUBLIC_ATTRIBUTION_DISCLOSURE_EN : PUBLIC_ATTRIBUTION_DISCLOSURE_ZH}
        </p>
        <p className="mt-3 rounded-xl border border-amber-300/15 bg-black/20 p-3 text-sm leading-6 text-amber-100">{pick(pack.archiveNotice, en)}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {[pack.verificationStatus, pack.executionAuthority, "CONSENSUS: NO", "TRADING: NO"].map((tag) => <span key={tag} className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{tag}</span>)}
        </div>
        <p className="mt-4 text-xs text-zinc-500">{en ? "Research archive" : "研究档案"} · {en ? "Ingested" : "录入"}: {pack.ingestedAt}</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pack.methodology.map((item) => <article key={item.title.en} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-semibold text-amber-200">{pick(item.title, en)}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{pick(item.description, en)}</p></article>)}
      </section>

      <section className="mt-8 space-y-6">
        {pack.cases.map((item) => <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{pick(item.name, en)}</h2><p className="mt-2 font-mono text-sm text-violet-200">{item.assumedBazi}</p></div><span className="rounded-full border border-amber-300/25 px-3 py-1 text-xs text-amber-200">{pick(item.calibrationStatus, en)}</span></div>
          {item.birthInput ? <p className="mt-4 text-sm text-zinc-400">{pick(item.birthInput, en)}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">{item.structureTags.map((tag) => <span key={tag.en} className="rounded-lg bg-violet-400/[0.08] px-3 py-2 text-xs text-violet-100">{pick(tag, en)}</span>)}</div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">{item.claims.map((claim) => <div key={claim.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap gap-2 text-[11px] text-zinc-500"><span>{claim.category}</span><span>·</span><span>{claim.verificationStatus}</span></div><h3 className="mt-3 text-sm font-semibold text-zinc-100">{en ? "Research material summary" : "研究资料摘要"}</h3><p className="mt-2 text-sm leading-6 text-zinc-300">{publicAttributionText(pick(claim.researchMaterialSummary, en),en?"en":"zh")}</p><h3 className="mt-4 text-sm font-semibold text-emerald-200">{en ? "Yi's interpretation" : PUBLIC_INTERPRETATION_LABEL_ZH}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{publicAttributionText(pick(claim.mooxInterpretation, en),en?"en":"zh")}</p></div>)}</div>
        </article>)}
      </section>

      <section className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Founder Influence Score</h2><span className="rounded-full border border-emerald-300/25 px-3 py-1 text-xs text-emerald-200">MOOX PROVISIONAL · DISPLAY ONLY</span></div>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{pick(pack.influenceScorePolicy.description, en)}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">{pick(pack.influenceScorePolicy.thresholdSource, en)} · {en ? "Review threshold" : "复核阈值"}: {pack.influenceScorePolicy.reviewThreshold}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{pack.influenceScorePolicy.thresholds.map((row) => <div key={row.min} className="rounded-xl border border-white/10 p-4"><div className="text-lg font-bold text-emerald-200">≥ {row.min}</div><div className="mt-1 text-sm font-semibold">{pick(row.label, en)}</div><p className="mt-2 text-xs leading-5 text-zinc-400">{pick(row.displayMeaning, en)}</p></div>)}</div>
      </section>
    </main>
  );
}
