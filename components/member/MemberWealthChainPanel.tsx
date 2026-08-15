import React from "react";
import type { MemberWealthChainView, WealthChainLocalizedText } from "@/types/member-wealth-chain";

const pick = (value: WealthChainLocalizedText, en: boolean) => (en ? value.en : value.zh);

export function MemberWealthChainPanel({ pack, locale }: { pack: MemberWealthChainView; locale: "zh" | "en" }) {
  const en = locale === "en";
  return (
    <section className="mt-8 rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.06] to-blue-500/[0.04] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {en ? "YI RESEARCH FRAMEWORK" : "易老师研究框架"} · RESEARCH ONLY
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{pick(pack.title, en)}</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">{pick(pack.description, en)}</p>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-black/20 px-3 py-1.5 text-xs text-cyan-100">
          {pack.episodeCount} {en ? "research records" : "份研究档案"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          en ? "Industry demand → revenue" : "产业需求 → 收入",
          en ? "Cash flow → return on capital" : "现金流 → 资本回报",
          en ? "Macro rates → valuation" : "宏观利率 → 估值",
        ].map((label) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-cyan-100">{label}</div>
        ))}
      </div>

      <p className="mt-5 rounded-xl border border-cyan-300/15 bg-black/20 p-3 text-xs leading-6 text-zinc-400">
        {pick(pack.archiveNotice, en)} {en ? "No record can trigger trading or overwrite formal forecasts." : "所有记录均不触发交易，也不覆盖正式预测。"}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {pack.episodes.map((episode, index) => (
          <details key={episode.id} className="group rounded-2xl border border-white/10 bg-black/20 p-4 open:border-cyan-300/20">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {en ? "Research" : "研究"} {String(index + 1).padStart(2, "0")} · {pick(episode.horizon, en)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold leading-6 text-zinc-100">{pick(episode.title, en)}</h3>
                </div>
                <span className="text-cyan-300 transition group-open:rotate-45">＋</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {episode.assets.map((asset) => <span key={asset} className="rounded-md bg-cyan-300/[0.08] px-2 py-1 text-[11px] text-cyan-100">{asset}</span>)}
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{pick(episode.thesis, en)}</p>
            </summary>

            <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
              <EvidenceList title={en ? "Evidence to watch" : "继续跟踪的证据"} items={episode.evidenceToWatch} en={en} />
              <EvidenceList title={en ? "Confirmation" : "确认信号"} items={episode.confirmationSignals} en={en} tone="positive" />
              <EvidenceList title={en ? "Invalidation" : "失效条件"} items={episode.invalidationSignals} en={en} tone="negative" />
              <div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-3">
                <h4 className="text-xs font-semibold text-violet-200">{en ? "How MOOX uses it" : "在 MOOX 中如何使用"}</h4>
                <p className="mt-2 text-xs leading-6 text-zinc-400">{pick(episode.portfolioUse, en)}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function EvidenceList({ title, items, en, tone = "neutral" }: {
  title: string;
  items: WealthChainLocalizedText[];
  en: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color = tone === "positive" ? "text-emerald-200" : tone === "negative" ? "text-rose-200" : "text-amber-200";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <h4 className={`text-xs font-semibold ${color}`}>{title}</h4>
      <ul className="mt-2 space-y-2 text-xs leading-5 text-zinc-400">
        {items.map((item) => <li key={item.en} className="flex gap-2"><span aria-hidden>•</span><span>{pick(item, en)}</span></li>)}
      </ul>
    </div>
  );
}
