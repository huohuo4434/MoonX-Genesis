"use client";
// MOOX_V72082_FOCUS_INTRADAY_CLIENT_BRIDGE

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";

type IntradayLevelDto = {
  support: string;
  resistance: string;
  invalidation: string;
  source: "CHAN_1H" | "SWING_1H" | "FALLBACK" | "UNAVAILABLE";
  sourceLabel: string;
  capturedAt: string;
  error: string | null;
};

type LoadState =
  | { status: "loading"; levels: null }
  | { status: "ready"; levels: IntradayLevelDto }
  | { status: "error"; levels: null };

function focusIntradayKey(assetId: string): string {
  return `FOCUS:${assetId.trim().toUpperCase()}`;
}

export function FocusIntradayTechnicalCards({
  assetId,
  direction,
}: {
  assetId: string;
  direction: string | null | undefined;
}) {
  const key = useMemo(() => focusIntradayKey(assetId), [assetId]);
  const [state, setState] = useState<LoadState>({ status: "loading", levels: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading", levels: null });

    const timer = window.setTimeout(() => controller.abort(), 7_000);
    void (async () => {
      try {
        const params = new URLSearchParams({ key });
        if (direction?.trim()) params.set("direction", direction.trim());
        const response = await fetch(`/api/member/intraday-levels?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const body = await response.json() as { ok?: boolean; levels?: IntradayLevelDto };
        if (!body.ok || !body.levels) throw new Error("INTRADAY_LEVEL_RESPONSE_INVALID");
        if (active) setState({ status: "ready", levels: body.levels });
      } catch {
        if (active) setState({ status: "error", levels: null });
      } finally {
        window.clearTimeout(timer);
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, direction]);

  const levels = state.status === "ready" ? state.levels : null;
  const live = Boolean(levels && levels.source !== "UNAVAILABLE");
  const support = live ? levels!.support : "—";
  const resistance = live ? levels!.resistance : "—";
  const invalidation = live ? levels!.invalidation : state.status === "loading" ? "计算1H结构…" : "1H行情刷新中";
  const source = live ? levels!.sourceLabel : state.status === "loading" ? "正在读取1H结构" : "1H行情刷新中";

  return (
    <>
      <Card padding="sm" className="border-emerald-300/15 bg-emerald-300/[0.025]">
        <p className="text-caption text-emerald-100/70">当日支撑</p>
        <p className="mt-1 text-body-sm font-semibold text-white/85">{support}</p>
        <p className="mt-1 text-[11px] text-white/35">{source}</p>
      </Card>
      <Card padding="sm" className="border-rose-300/15 bg-rose-300/[0.025]">
        <p className="text-caption text-rose-100/70">当日压力</p>
        <p className="mt-1 text-body-sm font-semibold text-white/85">{resistance}</p>
        <p className="mt-1 text-[11px] text-white/35">{source}</p>
      </Card>
      <Card padding="sm" className="border-white/[0.08] bg-black/20">
        <p className="text-caption text-white/40">失效位</p>
        <p className="mt-1 text-body-sm text-white/75">{invalidation}</p>
      </Card>
    </>
  );
}
