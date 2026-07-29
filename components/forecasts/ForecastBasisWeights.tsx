"use client";

import { useState } from "react";
import Link from "next/link";
import { Text } from "@/components/ui";
import {
  BASIS_LABELS,
  buildForecastBasisWeights,
  type ForecastBasisWeights as BasisMix,
} from "@/lib/forecasts/basis-weights";

/**
 * Collapsible weight mix — supplementary to ForecastEvidencePanel.
 * Includes methodology link; never presents Wave as the forecast subject.
 */
export function ForecastBasisWeights({
  wavePercent = 5,
  weights,
  waveNote,
}: {
  wavePercent?: number;
  weights?: BasisMix;
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
          模块权重（参考）
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
            上述百分比为当日参考分配，会随验证与关键位接近度调整，不是固定承诺。
          </p>
          <Link
            href="/methodology"
            className="mt-2 inline-block text-caption text-primary underline-offset-2 hover:underline"
          >
            查看MOOX预测方法
          </Link>
        </div>
      ) : null}
    </div>
  );
}
