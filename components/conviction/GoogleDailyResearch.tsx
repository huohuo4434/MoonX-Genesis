"use client";

import { GOOGLE_FOCUS_RESEARCH_20260808 } from "@/lib/data/conviction/google-focus-research-20260808";

const TAG_CLASS: Record<string, string> = {
  偏多: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  偏弱: "border-red-400/25 bg-red-400/10 text-red-200",
  观察: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  休市: "border-white/10 bg-white/[0.04] text-white/45",
};

export default function GoogleDailyResearch() {
  const r = GOOGLE_FOCUS_RESEARCH_20260808;
  return (
    <section className="space-y-5 rounded-xl border border-blue-400/15 bg-blue-400/[0.025] p-5 sm:p-6">
      <div>
        <p className="font-mono text-caption uppercase tracking-[.16em] text-blue-300/70">Google · 双框架复核</p>
        <h2 className="mt-2 text-h3 text-white">卦象全过程、连贯性与逐日路径</h2>
        <p className="mt-2 text-body-sm leading-7 text-white/65">{r.consistencyLabel}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {r.frameworks.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <p className="text-body-sm font-semibold text-white">{item.label}</p>
            <p className="mt-2 text-caption leading-6 text-white/60">{item.summary}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-body-sm font-semibold text-white">卦象时间序列</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {r.sequence.map((item) => (
            <div key={item.period} className="rounded-lg border border-white/[0.07] bg-[#0b0d12] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-caption font-semibold text-cyan-200">{item.period}</span><span className="text-caption text-white/50">{item.hexagram}</span></div>
              <p className="mt-1 text-caption leading-5 text-white/60">{item.view}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-body-sm font-semibold text-white">8月逐日分析（美股休市日只做风险观察，不计正式验证）</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {r.daily.map((day) => (
            <div key={day.date} className="rounded-lg border border-white/[0.07] bg-[#0b0d12] p-3">
              <div className="flex items-center gap-2"><span className="font-mono text-caption text-white/70">{day.date.slice(5)}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] ${TAG_CLASS[day.direction] ?? TAG_CLASS.观察}`}>{day.direction}</span></div>
              <p className="mt-2 text-caption leading-5 text-white/70">{day.summary}</p>
              <p className="mt-1 text-[11px] leading-5 text-white/40">确认：{day.confirmation}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-body-sm font-semibold text-white">9月至12月延伸</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {r.monthly.map((item) => (
            <div key={item.period} className="rounded-lg border border-white/[0.07] bg-[#0b0d12] p-3">
              <p className="text-caption font-semibold text-white">{item.period} · {item.direction}</p>
              <p className="mt-1 text-[11px] leading-5 text-white/50">{item.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
