"use client";

import { useState } from "react";
import { Badge, Card, Text } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { LiuYaoFactorAnalysis, LiuYaoFactorScore } from "@/types/research";

function renderStars(score: number) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-warning" aria-label={`${score} / 5`}>
      {"★".repeat(full)}
      {half ? "☆" : ""}
      {"☆".repeat(empty)}
    </span>
  );
}

function directionVariant(direction: LiuYaoFactorScore["direction"]) {
  if (direction === "利多" || direction === "略偏多") return "success" as const;
  if (direction === "利空" || direction === "略偏空") return "danger" as const;
  return "outline" as const;
}

function FactorCard({ factor }: { factor: LiuYaoFactorScore }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border/[0.08] bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="caption" weight="medium" className="text-foreground">
          {pickLocalized(factor.label, locale)}
        </Text>
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption text-foreground-secondary">{renderStars(factor.score)}</span>
          <Badge variant={directionVariant(factor.direction)}>{factor.direction}</Badge>
        </div>
      </div>
      <Text variant="caption" color="secondary" className="break-words">
        {pickLocalized(factor.explanation, locale)}
      </Text>
      {factor.evidence.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="self-start text-caption text-primary hover:underline"
        >
          {open ? "收起证据" : "查看证据"}
        </button>
      )}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-border/[0.06] pt-2">
          {factor.evidence.map((item, i) => (
            <li key={i} className="flex gap-2 text-caption text-foreground-tertiary">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground-tertiary" />
              <span className="min-w-0 break-words">{pickLocalized(item, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LiuYaoFactorPanel({ analysis }: { analysis: LiuYaoFactorAnalysis }) {
  const { locale } = useLocale();
  const factorEntries = Object.values(analysis.factors);

  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1">
        <Text variant="label" color="secondary">
          六爻因子解析
        </Text>
        <Text variant="caption" color="tertiary">
          将财爻、子孙、兄弟、官鬼、父母、世应和动变拆分展示。因子星级用于说明当前研究结构，不代表历史准确率。
        </Text>
      </div>

      <div className="rounded-md border border-border/[0.08] bg-background/50 p-3">
        <Text variant="caption" color="tertiary" className="mb-1 block">
          用神选择
        </Text>
        <Text variant="body-sm" color="secondary">
          主用神：{pickLocalized(analysis.primaryUseGod, locale)}
          {analysis.secondaryUseGod && ` · 次用神：${pickLocalized(analysis.secondaryUseGod, locale)}`}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          {pickLocalized(analysis.useGodReason, locale)}
        </Text>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {factorEntries.map((factor) => (
          <FactorCard key={factor.id} factor={factor} />
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
          <Text variant="caption" color="tertiary">
            综合趋势
          </Text>
          <Text variant="body-sm" weight="semibold">
            {analysis.trendScore}/100
          </Text>
        </div>
        <div className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
          <Text variant="caption" color="tertiary">
            波动强度
          </Text>
          <Text variant="body-sm" weight="semibold">
            {analysis.volatilityScore}/100
          </Text>
        </div>
        <div className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
          <Text variant="caption" color="tertiary">
            综合方向
          </Text>
          <Text variant="body-sm" weight="semibold" className="break-words">
            {pickLocalized(analysis.finalDirection, locale)}
          </Text>
        </div>
        <div className="rounded-md border border-border/[0.08] bg-muted/40 p-2.5">
          <Text variant="caption" color="tertiary">
            编辑置信度
          </Text>
          <Text variant="body-sm" weight="semibold">
            {analysis.confidence}%
          </Text>
        </div>
      </div>

      {analysis.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-caption text-foreground-tertiary">
          {analysis.warnings.map((w, i) => (
            <li key={i}>· {pickLocalized(w, locale)}</li>
          ))}
        </ul>
      )}

      <Text variant="caption" color="tertiary" className="border-t border-border/[0.06] pt-3">
        六爻属于传统象数研究框架，因子分数由 MOOX 进行结构化整理，尚非科学统计模型，不构成投资建议。
      </Text>
    </Card>
  );
}
