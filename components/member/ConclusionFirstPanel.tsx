import type { ReactNode } from "react";

export type ConclusionFirstTone = "positive" | "negative" | "turn" | "neutral" | "muted";

export type ConclusionFirstFact = {
  label: string;
  value: string;
  tone?: ConclusionFirstTone;
};

function factTone(tone: ConclusionFirstTone | undefined): string {
  if (tone === "positive") return "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100";
  if (tone === "negative") return "border-rose-300/20 bg-rose-300/[.06] text-rose-100";
  if (tone === "turn") return "border-violet-300/20 bg-violet-300/[.07] text-violet-100";
  if (tone === "muted") return "border-white/[.07] bg-white/[.02] text-white/42";
  return "border-amber-300/20 bg-amber-300/[.055] text-amber-100";
}

export function ConclusionFirstPanel({
  eyebrow = "先看结论",
  title,
  conclusion,
  facts = [],
  actions = [],
  detailLabel,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  conclusion: string;
  facts?: readonly ConclusionFirstFact[];
  actions?: readonly string[];
  detailLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-conclusion-first="1"
      className={`rounded-2xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(58,38,108,.20),rgba(7,9,14,.94))] p-4 sm:p-5 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-200/70">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-5xl text-sm leading-6 text-white/68">{conclusion}</p>

      {facts.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} className={`min-w-fit rounded-xl border px-3 py-2 ${factTone(fact.tone)}`}>
              <span className="text-[10px] opacity-55">{fact.label}</span>
              <span className="ml-2 text-xs font-semibold">{fact.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {actions.length ? (
        <ol className="mt-4 grid gap-2 text-xs leading-5 text-white/60 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action, index) => (
            <li key={action} className="flex gap-2 rounded-xl border border-white/[.07] bg-black/15 px-3 py-2.5">
              <span className="font-semibold text-violet-200">{index + 1}</span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {children ? (
        <details className="mt-4 border-t border-white/[.08] pt-3">
          <summary className="min-h-8 cursor-pointer py-1 text-xs font-medium text-white/45">{detailLabel ?? "展开详细依据"}</summary>
          <div className="mt-2 text-sm leading-6 text-white/55">{children}</div>
        </details>
      ) : null}
    </section>
  );
}
