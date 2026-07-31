"use client";

import Link from "next/link";
import { ForecastBasisWeights } from "@/components/forecasts/ForecastBasisWeights";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import {
  buildForecastBasisWeights,
  isTomorrowWaveAllowedSymbol,
  waveBasisPercentFromProximity,
} from "@/lib/forecasts/basis-weights";
import { buildIChingDirectionView } from "@/lib/forecasts/iching-direction-engine";
import { displayMarketCode } from "@/lib/forecasts/tomorrow-direction";
import {
  buildForecastModuleEvidence,
  dailyForecastToEvidenceSource,
} from "@/lib/methodology/evidence";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyForecast } from "@/types/daily-forecast";

function isPending(f: DailyForecast) {
  return f.confidence <= 0 || f.summary === "研究尚未完成" || f.status === "draft";
}

function hasConcreteLevels(f: DailyForecast): boolean {
  return Boolean(
    f.supportLevels?.some((s) => /\d/.test(s) && /—|–|-/.test(s)) &&
      f.resistanceLevels?.some((s) => /\d/.test(s) && /—|–|-/.test(s)) &&
      f.confirmation &&
      f.invalidation &&
      /\d/.test(f.confirmation) &&
      /\d/.test(f.invalidation)
  );
}


type ZoneKind = "support" | "resistance";

function parseZoneBounds(line: string): [number, number] | null {
  const nums = [...line.replace(/,/g, "").matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length < 2 || !nums.slice(0, 2).every(Number.isFinite)) return null;
  return [Math.min(nums[0]!, nums[1]!), Math.max(nums[0]!, nums[1]!)];
}

function orderedZoneLines(lines: string[] | undefined, kind: ZoneKind): string[] {
  const parsed = (lines ?? [])
    .map((line) => ({ line, bounds: parseZoneBounds(line) }))
    .filter((item): item is { line: string; bounds: [number, number] } => item.bounds != null)
    .sort((a, b) =>
      kind === "support" ? b.bounds[1] - a.bounds[1] : a.bounds[0] - b.bounds[0]
    );

  const kept: Array<{ line: string; bounds: [number, number] }> = [];
  for (const item of parsed) {
    const overlaps = kept.some((prior) => {
      const overlap = Math.min(prior.bounds[1], item.bounds[1]) - Math.max(prior.bounds[0], item.bounds[0]);
      const width = Math.max(1e-9, Math.min(prior.bounds[1] - prior.bounds[0], item.bounds[1] - item.bounds[0]));
      return overlap > 0 && overlap / width >= 0.5;
    });
    if (!overlaps) kept.push(item);
    if (kept.length >= 2) break;
  }

  return kept.length ? kept.map((item) => item.line) : lines ?? [];
}

function cleanConditionText(text: string | undefined, kind: "confirmation" | "invalidation"): string {
  if (!text) return "—";
  if (kind === "confirmation") {
    const match = text.match(/(1小时|30分钟|日线)K?线?收盘[^。；]*?压力区上沿\s*([\d,.]+(?:美元|点|元)?)/);
    if (match) return `${match[1]}收盘站稳${match[2]}上方，确认突破有效。`;
  }
  const match = text.match(/(1小时|30分钟|日线)K?线?收盘[^。；]*?支撑区下沿\s*([\d,.]+(?:美元|点|元)?)/);
  if (match) return `${match[1]}收盘跌破${match[2]}，原判断失效。`;
  return text;
}

function waveShare(f: DailyForecast): number {
  if (!isTomorrowWaveAllowedSymbol(f.symbol)) return 5;
  const nums = [...(f.supportLevels ?? []), ...(f.resistanceLevels ?? [])]
    .map((x) => {
      const m = String(x).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return m ? Number(m[0]) : null;
    })
    .filter((n): n is number => n != null && Number.isFinite(n));
  if (nums.length < 2) return waveBasisPercentFromProximity(null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const mid = (min + max) / 2;
  if (mid <= 0) return 5;
  return waveBasisPercentFromProximity(((max - min) / mid) * 100);
}

export function MarketForecastCard({ f }: { f: DailyForecast }) {
  const p = f.probabilities ?? {
    up: f.confidence,
    flat: Math.max(0, 100 - f.confidence),
    down: 0,
  };
  const iching = buildIChingDirectionView({
    directionLabel: f.directionLabel,
    direction: f.direction,
    expectedPath: f.expectedPath,
    summary: f.summary,
    confidence: f.confidence,
  });
  const showTech = hasConcreteLevels(f);
  const supportLines = orderedZoneLines(f.supportLevels, "support");
  const resistanceLines = orderedZoneLines(f.resistanceLevels, "resistance");
  const wavePct = waveShare(f);
  const basis = buildForecastBasisWeights(wavePct);
  const allowWaveNote = isTomorrowWaveAllowedSymbol(f.symbol);

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Text variant="body" weight="semibold" className="break-words">
            {f.assetName}{" "}
            <span className="font-mono text-body-sm font-normal text-foreground-tertiary">
              {displayMarketCode(f.symbol)}
            </span>
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            目标交易日：{formatDateChina(f.forecastForDate)} · V{f.version || 1} · 更新于 {formatDateTimeChina(f.publishedAt)}
          </Text>
        </div>
        <Badge variant="default">{iching.directionLabel}</Badge>
      </div>

      <div className="space-y-2 rounded-md border border-border/[0.08] bg-muted/20 p-3">
        <Text variant="caption" weight="semibold" className="uppercase tracking-wide text-foreground-tertiary">
          【六爻方向】
        </Text>
        <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-caption text-foreground-tertiary">预测方向</dt>
            <dd className="font-medium text-foreground">{iching.directionLabel}</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">风险强弱</dt>
            <dd>{iching.riskStrength}</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">上涨概率</dt>
            <dd className="font-mono tabular-nums">{p.up}%</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">震荡概率</dt>
            <dd className="font-mono tabular-nums">{p.flat}%</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">下跌概率</dt>
            <dd className="font-mono tabular-nums">{p.down}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-foreground-tertiary">运行路径</dt>
            <dd className="text-foreground-secondary">{iching.path.join(" → ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-foreground-tertiary">六爻方向依据</dt>
            <dd className="text-foreground-secondary">{iching.evidence}</dd>
          </div>
        </dl>
      </div>

      {showTech ? (
        <div className="space-y-2 rounded-md border border-border/[0.08] bg-muted/10 p-3">
          <Text variant="caption" weight="semibold" className="uppercase tracking-wide text-foreground-tertiary">
            【技术结构】
          </Text>
          <dl className="grid gap-2 text-body-sm">
            {supportLines.map((line, index) => (
              <div key={line}>
                <dt className="text-caption text-foreground-tertiary">第{index + 1}支撑区</dt>
                <dd className="break-words text-foreground-secondary">{line}</dd>
              </div>
            ))}
            {resistanceLines.map((line, index) => (
              <div key={line}>
                <dt className="text-caption text-foreground-tertiary">第{index + 1}压力区</dt>
                <dd className="break-words text-foreground-secondary">{line}</dd>
              </div>
            ))}
            <div>
              <dt className="text-caption text-foreground-tertiary">确认条件</dt>
              <dd className="break-words text-foreground-secondary">{cleanConditionText(f.confirmation, "confirmation")}</dd>
            </div>
            <div>
              <dt className="text-caption text-foreground-tertiary">失效条件</dt>
              <dd className="break-words text-foreground-secondary">{cleanConditionText(f.invalidation, "invalidation")}</dd>
            </div>
            {f.priceDataSourceLabel ? (
              <div>
                <dt className="text-caption text-foreground-tertiary">技术价位依据</dt>
                <dd className="text-foreground-secondary">
                  行情来源 {f.priceDataSourceLabel}
                  {f.priceSnapshotAtLabel ? ` · 快照 ${formatDateTimeChina(f.priceSnapshotAtLabel)}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {f.symbol === "WTI" || f.symbol === "CL=F" ? (
        <Text variant="caption" color="tertiary">
          行情及验证使用WTI近月连续合约，不代表特定交割月份的现货价格。
        </Text>
      ) : null}

      <ForecastBasisWeights
        weights={basis}
        wavePercent={wavePct}
        waveNote={
          allowWaveNote
            ? "仅作辅助证据；接近波浪关键位时权重可升至最高 20%，不构成预测主体。"
            : null
        }
      />
      <ForecastEvidencePanel
        items={buildForecastModuleEvidence(dailyForecastToEvidenceSource(f))}
      />
    </Card>
  );
}

export function MemberTomorrowHiddenPage({
  isAdmin,
  adminHint,
}: {
  isAdmin?: boolean;
  adminHint?: string;
}) {
  // Non-admins: render nothing (no shell). Admins get a backend-only hint.
  if (!isAdmin) {
    return <main className="min-h-[40vh]" />;
  }
  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto max-w-2xl px-4">
          <Heading as="h1" size="h3">
            下一交易日模块未对会员开放
          </Heading>
          <Text variant="body-sm" color="secondary" className="mt-2">
            {adminHint ?? "下一交易日观点尚未准备完成。"}
          </Text>
          <div className="mt-4">
            <Button asChild>
              <Link href="/admin/forecasts">打开预测后台</Link>
            </Button>
          </div>
        </div>
      </Section>
    </main>
  );
}

export function TomorrowForecastContent({
  forecasts,
  embedded = false,
}: {
  forecasts: DailyForecast[];
  embedded?: boolean;
}) {
  const ordered = sortByDailyAssetOrder(
    forecasts.filter((f) => !isPending(f))
  );
  if (ordered.length === 0) {
    return embedded ? null : <MemberTomorrowHiddenPage isAdmin={false} />;
  }
  const publishedAt = ordered
    .map((f) => f.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const version = `V${Math.max(...ordered.map((f) => f.version || 1), 1)}`;
  const headingAs: "h1" | "h2" = embedded ? "h2" : "h1";

  const content = (
    <Section spacing="lg">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <Badge variant="default" className="mb-3">
          会员专享
        </Badge>
        <Heading as={headingAs} size={embedded ? "h3" : "h2"} className="mb-2">
          下一交易日预测
        </Heading>
        <Text variant="body" color="secondary" className="mb-2 max-w-2xl">
          完整方向、概率、运行路径与关键价位按账户权限展示。
        </Text>
        <Text variant="caption" color="tertiary" className="mb-6 block">
          各市场目标交易日见对应卡片 · 最后更新{" "}
          {publishedAt ? formatDateTimeChina(publishedAt) : "—"} · {version}
        </Text>

        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((f) => (
            <MarketForecastCard key={f.id} f={f} />
          ))}
        </div>
      </div>
    </Section>
  );

  return embedded ? content : <main>{content}</main>;
}

export function MemberTomorrowFullPage({ forecasts }: { forecasts: DailyForecast[] }) {
  return <TomorrowForecastContent forecasts={forecasts} />;
}
