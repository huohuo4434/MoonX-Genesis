"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MemberTradingOnboarding = dynamic(
  () => import("@/components/member/MemberTradingOnboarding").then((module) => module.MemberTradingOnboarding),
  {
    ssr: false,
    loading: () => <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 text-sm text-white/45">正在加载API接入向导……</div>,
  }
);

export function MemberTradingOnboardingLazy() {
  const [open, setOpen] = useState(false);
  if (open) return <MemberTradingOnboarding />;
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-100/45">OPTIONAL SETUP</p>
      <h2 className="mt-2 text-xl font-semibold text-white">需要接入自己的交易账户？</h2>
      <p className="mt-2 text-sm leading-6 text-white/48">接入向导和品种/API信息只在你主动展开后加载，不影响上方交易台速度。</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[.07] px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[.12]"
      >
        展开API接入向导
      </button>
    </section>
  );
}
