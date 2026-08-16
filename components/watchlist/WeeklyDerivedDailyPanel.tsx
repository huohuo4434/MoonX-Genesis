"use client";

import { useMemo } from "react";
import {
  deriveWeeklyDailyCards,
  normalizeWeeklyPeriods,
  selectActiveOrNextPeriod,
} from "@/lib/forecasts/watchlist-weekly-derived";

export function WeeklyDerivedDailyPanel(props: {
  assetSlug: string;
  assetName?: string;
  periods: unknown;
}) {
  const model = useMemo(() => {
    const periods = normalizeWeeklyPeriods(props.periods);
    const period = selectActiveOrNextPeriod(periods);
    if (!period) return null;
    return { period, cards: deriveWeeklyDailyCards({ slug: props.assetSlug, period }) };
  }, [props.assetSlug, props.periods]);

  if (!model || !model.cards.length) return null;

  return (
    <section
      data-weekly-derived-daily-panel="true"
      className="mx-auto mt-8 w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-cyan-300/80">周卦拆解 · 技术验算</div>
          <h2 className="mt-2 text-2xl font-bold text-white">下一周每日分析</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
            不单独起日卦。每日方向由已锁定周卦或阶段卦拆解；缠论、支撑压力和成交结构只负责确认位置，不能反向修改六爻方向。
          </p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300">
          {model.period.periodStart}—{model.period.periodEnd}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {model.cards.map((card) => (
          <article key={card.date} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <time className="text-sm font-semibold text-white">{card.date}</time>
              <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
                {card.direction}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{card.path}</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">{card.execution}</p>
            <div className="mt-3 text-[11px] text-slate-600">MOOX_WEEK_DERIVED{card.sourceVersion ? ` · ${card.sourceVersion}` : ""}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
