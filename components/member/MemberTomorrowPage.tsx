"use client";

import Link from "next/link";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import { buildIChingDirectionView } from "@/lib/forecasts/iching-direction-engine";
import { displayMarketCode } from "@/lib/forecasts/tomorrow-direction";
import { formatDateTimeChina } from "@/lib/utils/datetime";
import { assetVenue } from "@/lib/presentation/asset-catalog";
import { getTradingSessionDisplay } from "@/lib/calendar/trading-session-display";
import { deriveForecastConsensus, starsText } from "@/lib/forecasts/consensus-confidence";
import { normalizeDailyLanguage, normalizeDailyPath, signalStrengthFromConfidence } from "@/lib/forecasts/daily-language";
import { mooxDirectionArrow, mooxDirectionLabelZh, mooxTechnicalReferenceZh } from "@/lib/forecasts/moox-direction-doctrine";
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
    if (match) return `${match[1]}收盘站稳${match[2]}上方，作为跟随/加仓位置参考。`;
  }
  const match = text.match(/(1小时|30分钟|日线)K?线?收盘[^。；]*?支撑区下沿\s*([\d,.]+(?:美元|点|元)?)/);
  if (match) return `${match[1]}收盘跌破${match[2]}，作为风控位置参考；不反向修改六爻方向。`;
  return mooxTechnicalReferenceZh(text, kind === "confirmation" ? "follow" : "risk");
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
    expectedPath: normalizeDailyPath(f.intradayRhythm?.length ? f.intradayRhythm : f.expectedPath),
    summary: normalizeDailyLanguage(f.summary),
    confidence: f.confidence,
  });
  const showTech = hasConcreteLevels(f);
  const supportLines = orderedZoneLines(f.supportLevels, "support");
  const resistanceLines = orderedZoneLines(f.resistanceLevels, "resistance");
  const session = getTradingSessionDisplay({
    market: f.market,
    forecastDate: f.forecastForDate,
    publishedAt: f.publishedAt,
    symbol: f.symbol,
  });
  const consensus = deriveForecastConsensus(f);
  const pathBias = normalizeDailyLanguage(f.pathBias || f.expectedPath?.join(" → ")) || "运行节奏待补充";
  const signalStrength = f.signalStrength ?? iching.signalStrength ?? signalStrengthFromConfidence(f.confidence);

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
          <Text variant="caption" color="tertiary" className="block">{assetVenue(f.symbol)}</Text>
          <div className="flex flex-wrap items-center gap-2">
            <Text
              variant="caption"
              className={`block ${session.isDeferred ? "font-semibold text-amber-400" : "text-foreground-tertiary"}`}
            >
              {session.title}：{session.targetDateZh}
            </Text>
            {session.alertLabel ? (
              <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                {session.alertLabel}
              </Badge>
            ) : null}
          </div>
          {session.exchangeTimeLine ? (
            <Text variant="caption" color="tertiary" className="block">
              {session.exchangeTimeLine}
            </Text>
          ) : null}
          {session.beijingTimeLine ? (
            <Text variant="caption" color="tertiary" className="block">
              {session.beijingTimeLine}
            </Text>
          ) : null}
          <Text variant="caption" color="tertiary" className="block">
            最近更新：{formatDateTimeChina(f.publishedAt)} · 版本 V{f.version} · 已锁定
          </Text>
        </div>
        <Badge variant="default">{mooxDirectionArrow(iching.directionLabel)} {mooxDirectionLabelZh(iching.directionLabel)}</Badge>
      </div>

      <div className={`rounded-xl border p-4 ${mooxDirectionLabelZh(iching.directionLabel) === "看涨" ? "border-emerald-400/20 bg-emerald-400/[0.04]" : mooxDirectionLabelZh(iching.directionLabel) === "看跌" ? "border-rose-400/20 bg-rose-400/[0.04]" : "border-amber-400/20 bg-amber-400/[0.04]"}`}>
        <Text variant="caption" className="font-semibold text-foreground-tertiary">MOOX 唯一方向</Text>
        <div className="mt-1 text-xl font-semibold">{mooxDirectionArrow(iching.directionLabel)} {mooxDirectionLabelZh(iching.directionLabel)}</div>
        <Text variant="body-sm" color="secondary" className="mt-2 block">方向由六爻主判断确定；技术结构只负责找点位、跟随位置与风控，不会把看涨改成看跌或把看跌改成看涨。</Text>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/[0.06] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Text variant="caption" color="tertiary" className="block">方法共识度</Text>
            <Text variant="body" weight="semibold" className="mt-1 block text-primary">
              {starsText(consensus.stars)} · {consensus.label}
            </Text>
          </div>
          <div className="text-right">
            <Text variant="caption" color="tertiary" className="block">共识分</Text>
            <Text variant="body" weight="semibold" className="font-mono tabular-nums">
              {consensus.score}
            </Text>
          </div>
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block">
          {consensus.note} 星级表示方法一致程度，不代表预期涨幅。
        </Text>
      </div>

      <div className="space-y-2 rounded-md border border-border/[0.08] bg-muted/20 p-3">
        <Text variant="caption" weight="semibold" className="uppercase tracking-wide text-foreground-tertiary">
          【六爻方向】
        </Text>
        <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-caption text-foreground-tertiary">六爻原始路径</dt>
            <dd className="font-medium text-foreground">{iching.directionLabel}</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">信号强度</dt>
            <dd>{signalStrength}</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">上涨情景权重</dt>
            <dd className="font-mono tabular-nums">{p.up}%</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">震荡情景权重</dt>
            <dd className="font-mono tabular-nums">{p.flat}%</dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-tertiary">下跌情景权重</dt>
            <dd className="font-mono tabular-nums">{p.down}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-foreground-tertiary">运行路径倾向</dt>
            <dd className="text-foreground-secondary">{pathBias}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption text-foreground-tertiary">方向规则</dt>
            <dd className="text-foreground-secondary">六爻定方向；技术条件只决定位置和节奏，不决定多空方向。</dd>
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
            【技术点位｜不决定方向】
          </Text>
          <Text variant="caption" color="tertiary" className="block">技术分析只用于找支撑、压力和执行位置，不参与修改上方MOOX唯一方向。</Text>
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
              <dt className="text-caption text-foreground-tertiary">跟随参考</dt>
              <dd className="break-words text-foreground-secondary">{cleanConditionText(f.confirmation, "confirmation")}</dd>
            </div>
            <div>
              <dt className="text-caption text-foreground-tertiary">风控参考</dt>
              <dd className="break-words text-foreground-secondary">{cleanConditionText(f.invalidation, "invalidation")}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {f.symbol === "WTI" || f.symbol === "CL=F" ? (
        <Text variant="caption" color="tertiary">
          行情及验证使用WTI近月连续合约，不代表特定交割月份的现货价格。
        </Text>
      ) : null}

      {session.weekendRiskLabel ? (
        <Text variant="caption" className="rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-2 text-amber-200/80">
          {session.weekendRiskLabel}
        </Text>
      ) : null}



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
          先给六爻唯一方向，再给运行节奏和技术点位；技术分析不反向修改方向。
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
