"use client";

import Link from "next/link";
import { ForecastBasisWeights } from "@/components/forecasts/ForecastBasisWeights";
import { ForecastEvidencePanel } from "@/components/forecasts/ForecastEvidencePanel";
import { LockIcon } from "@/components/icons";
import { ShareButtons } from "@/components/social/ShareButtons";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import {
  buildForecastBasisWeights,
  isTomorrowWaveAllowedSymbol,
  waveBasisPercentFromProximity,
} from "@/lib/forecasts/basis-weights";
import {
  displayMarketCode,
  normalizeTomorrowDirection,
} from "@/lib/forecasts/tomorrow-direction";
import {
  buildForecastModuleEvidence,
  dailyForecastToEvidenceSource,
} from "@/lib/methodology/evidence";
import {
  FORMAL_PUBLISH_LABEL,
  TOMORROW_SCHEDULE_COPY,
  plannedPublishAtIso,
  tomorrowPublishState,
} from "@/lib/calendar/publish-windows";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyForecast, TomorrowForecastPublicSummary } from "@/types/daily-forecast";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { CORE_TOMORROW_ASSETS } from "@/lib/data/daily-forecasts";

function isPending(f: DailyForecast) {
  return f.confidence <= 0 || f.summary === "研究尚未完成" || f.status === "draft";
}

function firstPrice(levels?: string[]): string | null {
  const line = levels?.find((x) => Boolean(x?.trim()));
  return line?.trim() || null;
}

function riskLabel(f: DailyForecast): string {
  const conf = f.confidence;
  if (conf >= 65) return "中高";
  if (conf >= 50) return "中等";
  if (conf > 0) return "中等偏高";
  return "—";
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

function MarketForecastCard({ f }: { f: DailyForecast }) {
  const p = f.probabilities ?? {
    up: f.confidence,
    flat: Math.max(0, 100 - f.confidence),
    down: 0,
  };
  const direction = normalizeTomorrowDirection(f.directionLabel ?? f.direction);
  const support = firstPrice(f.supportLevels);
  const resistance = firstPrice(f.resistanceLevels);
  const wavePct = waveShare(f);
  const basis = buildForecastBasisWeights(wavePct);
  const allowWaveNote = isTomorrowWaveAllowedSymbol(f.symbol);

  return (
    <Card padding="lg" className="flex flex-col gap-3">
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
        <Badge variant="default">{direction}</Badge>
      </div>

      <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
        <div>
          <dt className="text-caption text-foreground-tertiary">预测方向</dt>
          <dd className="font-medium text-foreground">{direction}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">风险等级</dt>
          <dd>{riskLabel(f)}</dd>
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
          <dt className="text-caption text-foreground-tertiary">主要路径</dt>
          <dd className="text-foreground-secondary">
            {f.expectedPath?.length ? f.expectedPath.join(" → ") : f.headline || f.summary}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">关键支撑</dt>
          <dd className="break-words text-foreground-secondary">{support ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">关键压力</dt>
          <dd className="break-words text-foreground-secondary">{resistance ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">确认位</dt>
          <dd className="break-words text-foreground-secondary">{f.confirmation ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-foreground-tertiary">失效位</dt>
          <dd className="break-words text-foreground-secondary">{f.invalidation ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">催化因素</dt>
          <dd className="text-foreground-secondary">
            {f.catalysts?.length ? f.catalysts.join("、") : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-caption text-foreground-tertiary">主要风险</dt>
          <dd className="text-foreground-secondary">
            {f.risks?.length ? f.risks.join("；") : f.invalidation ?? "—"}
          </dd>
        </div>
      </dl>

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

function BatchMeta({
  forecastDate,
  plannedPublishAt,
  publishedAt,
  version,
  status,
  marketCount,
}: {
  forecastDate?: string;
  plannedPublishAt?: string;
  publishedAt?: string;
  version: string;
  status: string;
  marketCount: number;
}) {
  return (
    <Card padding="md" className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div>
        <p className="text-caption text-foreground-tertiary">目标交易日期</p>
        <p className="text-body-sm font-medium">
          {forecastDate ? formatDateChina(forecastDate) : "—"}
        </p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">计划发布时间</p>
        <p className="text-body-sm font-medium">
          {plannedPublishAt ? formatDateTimeChina(plannedPublishAt) : FORMAL_PUBLISH_LABEL}
        </p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">实际发布时间</p>
        <p className="text-body-sm font-medium">
          {publishedAt ? formatDateTimeChina(publishedAt) : "—"}
        </p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">版本号</p>
        <p className="text-body-sm font-medium font-mono">{version}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">锁定状态</p>
        <p className="text-body-sm font-medium">{status}</p>
      </div>
      <div>
        <p className="text-caption text-foreground-tertiary">覆盖市场数量</p>
        <p className="text-body-sm font-medium font-mono">{marketCount}</p>
      </div>
    </Card>
  );
}

export function MemberTomorrowLockedPage({
  summary,
}: {
  summary: TomorrowForecastPublicSummary;
}) {
  const covered = [
    "BTC",
    "S&P 500",
    "NASDAQ 100",
    "上证指数",
    "恒生科技",
    "黄金",
    "WTI原油",
  ];

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
          <div className="flex items-center gap-2">
            <LockIcon size={18} />
            <Badge variant="default">会员专享</Badge>
          </div>
          <Heading as="h1" size="h2">
            下一交易日完整预测
          </Heading>
          <Text variant="body" color="secondary">
            会员可提前查看下一交易日完整判断。未开通会员仅显示统一预览卡，不展示具体方向与概率。
          </Text>
          <BatchMeta
            forecastDate={summary.nextDateIso}
            plannedPublishAt={plannedPublishAtIso(getBeijingTodayKey())}
            status="会员锁定"
            version="—"
            marketCount={covered.length}
          />
          <Card padding="lg" className="space-y-4 border-border/[0.1]">
            <Text variant="body" weight="semibold">
              下一交易日完整预测
            </Text>
            <div>
              <Text variant="caption" color="tertiary">
                已覆盖
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1">
                {covered.join(" · ")}
              </Text>
            </div>
            <div>
              <Text variant="caption" color="tertiary">
                会员可查看
              </Text>
              <ul className="mt-2 space-y-1 text-body-sm text-foreground-secondary">
                <li>明确方向</li>
                <li>三项概率</li>
                <li>关键支撑</li>
                <li>关键压力</li>
                <li>确认位</li>
                <li>失效位</li>
                <li>运行路径</li>
                <li>证据摘要</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild variant="primary">
                <Link href="/pricing">解锁明日预测</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login?next=/member/tomorrow">登录</Link>
              </Button>
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}

export function MemberTomorrowEmptyPage({
  targetDate,
  isAdmin,
  nowIso,
}: {
  targetDate: string;
  isAdmin?: boolean;
  nowIso?: string;
}) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const state = tomorrowPublishState(false, now);
  const title =
    state === "delayed"
      ? TOMORROW_SCHEDULE_COPY.delayedTitle
      : TOMORROW_SCHEDULE_COPY.waitingTitle;
  const body =
    state === "delayed"
      ? TOMORROW_SCHEDULE_COPY.delayedBody
      : TOMORROW_SCHEDULE_COPY.waitingBody;

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto max-w-2xl px-4">
          <Heading as="h1" size="h2">
            {TOMORROW_SCHEDULE_COPY.title}
          </Heading>
          <Text variant="body" color="secondary" className="mt-2">
            {TOMORROW_SCHEDULE_COPY.description}
          </Text>
          <Text variant="caption" color="tertiary" className="mt-1 block">
            固定发布时间：{FORMAL_PUBLISH_LABEL}
          </Text>
          <BatchMeta
            forecastDate={targetDate && targetDate > getBeijingTodayKey(now) ? targetDate : undefined}
            plannedPublishAt={plannedPublishAtIso(getBeijingTodayKey(now))}
            status={state === "delayed" ? "延迟发布" : "尚未发布"}
            version="—"
            marketCount={0}
          />
          <Card padding="lg" className="mt-2 space-y-3">
            <Text variant="body" weight="semibold">
              {title}
            </Text>
            <Text variant="body-sm" color="secondary">
              {body}
            </Text>
            {isAdmin ? (
              <Button asChild>
                <Link href="/admin/forecasts">创建下一交易日预测</Link>
              </Button>
            ) : null}
          </Card>
        </div>
      </Section>
    </main>
  );
}

export function MemberTomorrowFullPage({ forecasts }: { forecasts: DailyForecast[] }) {
  const ordered = sortByDailyAssetOrder(forecasts.filter((f) => !isPending(f)));
  const nextDate = ordered[0]?.forecastForDate ?? "";
  const publishedAt = ordered
    .map((f) => f.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const version = `V${Math.max(...ordered.map((f) => f.version || 1), 1)}`;

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
          <Badge variant="default" className="mb-3">
            会员专享
          </Badge>
          <Heading as="h1" size="h2" className="mb-2">
            {TOMORROW_SCHEDULE_COPY.title}
          </Heading>
          <Text variant="body" color="secondary" className="mb-2 max-w-2xl">
            {TOMORROW_SCHEDULE_COPY.description}
          </Text>
          <Text variant="caption" color="tertiary" className="mb-6 block">
            固定发布时间：{FORMAL_PUBLISH_LABEL}
          </Text>

          <BatchMeta
            forecastDate={nextDate}
            plannedPublishAt={plannedPublishAtIso(getBeijingTodayKey())}
            publishedAt={publishedAt}
            version={version}
            status="已锁定"
            marketCount={ordered.length}
          />

          <ShareButtons
            className="mb-6"
            url="/forecasts/daily"
            forecastDate={nextDate}
            summary="MOOX 每日市场预测"
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {CORE_TOMORROW_ASSETS.map((asset) => {
              const f = ordered.find((x) => x.assetId === asset.assetId);
              if (f) return <MarketForecastCard key={f.id} f={f} />;
              return (
                <Card key={asset.assetId} padding="lg" className="flex flex-col gap-2">
                  <Text variant="body" weight="semibold">
                    {asset.assetName}{" "}
                    <span className="font-mono text-body-sm font-normal text-foreground-tertiary">
                      {displayMarketCode(asset.symbol)}
                    </span>
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    该市场下一交易日预测尚未发布
                  </Text>
                </Card>
              );
            })}
          </div>
        </div>
      </Section>
    </main>
  );
}
