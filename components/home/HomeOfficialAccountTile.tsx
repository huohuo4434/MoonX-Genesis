"use client";

// MOOX_V7208_HOME_LIVE_DEFERRED

import Link from "next/link";
import { useEffect, useState } from "react";

type PublicLivePayload = {
  positions?: Array<{ status?: string | null }>;
};

type LiveState =
  | { status: "loading"; count: null }
  | { status: "ready"; count: number }
  | { status: "error"; count: null };

export function HomeOfficialAccountTile() {
  const [state, setState] = useState<LiveState>({ status: "loading", count: null });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2_500);

    fetch("/api/public/live-trading", {
      cache: "default",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("live snapshot unavailable");
        return response.json() as Promise<PublicLivePayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        const count = (payload.positions ?? []).filter(
          (row) => !["CLOSED", "CANCELLED"].includes(String(row.status ?? "").toUpperCase()),
        ).length;
        setState({ status: "ready", count });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", count: null });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <Link href="/member/ai-trading" className="rounded-3xl border border-cyan-400/12 bg-[linear-gradient(150deg,rgba(7,34,42,.95),rgba(7,9,14,.98))] p-4">
      <p className="text-[11px] tracking-[0.16em] text-cyan-300/70">TRADE</p>
      <h3 className="mt-1 font-semibold">官方账户 / AI</h3>
      <p className="mt-3 text-2xl font-semibold" aria-live="polite">
        {state.status === "ready" ? state.count : "—"}
      </p>
      <p className="mt-1 text-xs text-white/38">
        {state.status === "loading" ? "正在同步公开状态" : state.status === "ready" ? "当前公开持仓" : "公示接口暂不可读"}
      </p>
    </Link>
  );
}
