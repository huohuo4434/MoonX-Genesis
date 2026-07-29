"use client";

import { useState } from "react";
import { Text } from "@/components/ui";
import {
  BASIS_LABELS,
  buildForecastBasisWeights,
  type ForecastBasisWeights,
} from "@/lib/forecasts/basis-weights";

/**
 * Collapsible “预测依据” under a market card — never a Wave specialty block.
 */
export function ForecastBasisWeights({
  wavePercent = 5,
  weights,
  waveNote,
}: {
  wavePercent?: number;
  weights?: ForecastBasisWeights;
  /** Optional Wave supplement — only for BTC / gold / WTI. */
  waveNote?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const mix = weights ?? buildForecastBasisWeights(wavePercent);

  return (
    <div className="mt-2 rounded-lg border border-border/[0.08] bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Text variant="caption" color="tertiary">
          预测依据
        </Text>
        <span className="text-caption text-foreground-tertiary">{open ? "收起" : "展开"}</span>
      </button>
      {open ? (
        <div className="border-t border-border/[0.06] px-3 py-2.5">
          <ul className="space-y-1">
            {BASIS_LABELS.map(({ key, label }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-3 text-caption text-foreground-secondary"
              >
                <span>{label}</span>
                <span className="font-mono tabular-nums text-foreground">{mix[key]}%</span>
              </li>
            ))}
          </ul>
          {waveNote ? (
            <p className="mt-2 text-caption text-foreground-tertiary">
              波浪补充：{waveNote}
            </p>
          ) : null}
          <p className="mt-2 text-caption text-foreground-tertiary">
            波浪分析仅为辅助证据，当前权重 {mix.wave}%（上限 20%）。
          </p>
        </div>
      ) : null}
    </div>
  );
}
