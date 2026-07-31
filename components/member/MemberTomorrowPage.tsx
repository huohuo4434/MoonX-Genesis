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
            预测版本：V{f.version || 1} · 锁定时间 {formatDateTimeChina(f.publishedAt)}
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
            {(f.supportLevels ?? []).map((line) => (
              <div key={line}>
                <dt className="text-caption text-foreground-tertiary">支撑区间</dt>
                <dd className="break-words text-foreground-secondary">{line}</dd>
              </div>
            ))}
            {(f.resistanceLevels ?? []).map((line) => (
              <div key={line}>
                <dt className="text-caption text-foreground-tertiary">压力区间</dt>
                <dd className="break-words text-foreground-secondary">{line}</dd>
              </div>
            ))}
            <div>
              <dt className="text-caption text-foreground-tertiary">确认条件</dt>
              <dd className="break-words text-foreground-secondary">{f.confirmation}</dd>
            </div>
            <div>
              <dt className="text-caption text-foreground-tertiary">失效条件</dt>
              <dd className="break-words text-foreground-secondary">{f.invalidation}</dd>
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
            {adminHint ?? "自动预测批次暂未生成，系统会继续重试。"}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-2 block">
            发布方式：系统自动生成并持续更新，管理员仅作必要修正。
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
  const nextDate = ordered[0]?.forecastForDate ?? "";
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
          系统自动综合周度方向、关键日期与技术结构并持续更新。技术点位暂缺时，方向和路径仍照常展示。
        </Text>
        <Text variant="caption" color="tertiary" className="mb-6 block">
          目标交易日 {formatDateChina(nextDate)} · 最后更新{" "}
          {publishedAt ? formatDateTimeChina(publishedAt) : "—"} · {version} · 自动发布
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
