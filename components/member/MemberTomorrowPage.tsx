"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PriceLevelsBlock } from "@/components/forecasts/PriceLevelsBlock";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { WaveIntelligenceCard } from "@/components/wave/WaveIntelligenceCard";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { sortByDailyAssetOrder } from "@/lib/data/daily-asset-order";
import { displayDirection } from "@/lib/data/daily-forecasts";
import { nextUpdateLabelForSymbol } from "@/lib/calendar/publish-windows";
import { formatDateChina, formatDateTimeChina } from "@/lib/utils/datetime";
import type { DailyForecast, DailyForecastMarket, TomorrowForecastPublicSummary } from "@/types/daily-forecast";

const MARKETS: Array<{ id: "all" | DailyForecastMarket; zh: string; en: string }> = [
  { id: "all", zh: "全部市场", en: "All markets" },
  { id: "crypto", zh: "加密", en: "Crypto" },
  { id: "us", zh: "美股", en: "US" },
  { id: "cn", zh: "A股", en: "CN" },
  { id: "hk", zh: "港股", en: "HK" },
  { id: "commodity", zh: "商品", en: "Commodity" },
];

function isPending(f: DailyForecast) {
  return f.confidence <= 0 || f.summary === "研究尚未完成" || f.status === "draft";
}

function ScheduleHeader({
  nextDateIso,
  assetNames,
  lastUpdated,
}: {
  nextDateIso: string;
  assetNames: string[];
  lastUpdated?: string;
}) {
  return (
    <div className="mb-8 space-y-3">
      <Card padding="md" className="space-y-2">
        <p className="text-body-sm">
          目标交易日期：<strong>{formatDateChina(nextDateIso)}</strong>
        </p>
        <p className="text-body-sm text-foreground-secondary">
          当前已发布资产：{assetNames.length} 项
          {assetNames.length ? `（${assetNames.join("、")}）` : ""}
        </p>
        {lastUpdated ? (
          <p className="text-body-sm text-foreground-secondary">最后更新时间：{lastUpdated}</p>
        ) : null}
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["WTI", "05:30"],
          ["美股与黄金", "06:30"],
          ["BTC及中国权益", "18:30"],
          ["今日公开", "08:00"],
        ].map(([label, time]) => (
          <Card key={label} padding="md" className="flex items-center justify-between gap-2">
            <span className="text-body-sm text-foreground-secondary">{label}</span>
            <span className="font-mono text-body-sm tabular-nums">{time}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function MemberTomorrowLockedPage({
  summary,
}: {
  summary: TomorrowForecastPublicSummary;
}) {
  const t = useTranslations();
  const teasers = sortByDailyAssetOrder(summary.teasers.filter((x) => x.isReady));

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
          <div className="flex items-center gap-2">
            <LockIcon size={18} />
            <Badge variant="default">{t("home.tomorrowMemberBadge")}</Badge>
          </div>
          <Heading as="h1" size="h2">
            {t("memberTomorrow.title")}
          </Heading>
          <Text variant="body" color="secondary">
            {t("memberTomorrow.lockedBody")}
          </Text>
          <ScheduleHeader
            nextDateIso={summary.nextDateIso}
            assetNames={teasers.map((x) => x.assetName)}
            lastUpdated={summary.lastUpdatedLabel !== "—" ? summary.lastUpdatedLabel : undefined}
          />
          <div className="grid gap-3">
            {teasers.map((trow) => (
              <Card key={trow.id} padding="md" className="flex flex-col gap-2">
                <Text variant="body" weight="semibold">
                  {trow.assetName}
                </Text>
                <p className="text-caption text-foreground-tertiary">
                  预测日期：{formatDateChina(trow.forecastForDate)}
                </p>
                <p className="text-caption text-foreground-tertiary">观点已生成</p>
                <Badge variant="outline" className="w-fit">
                  会员锁定
                </Badge>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="primary">
              <Link href="/pricing">{t("home.tomorrowUnlockCta")}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </main>
  );
}

export function MemberTomorrowFullPage({ forecasts }: { forecasts: DailyForecast[] }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";
  const [market, setMarket] = useState<"all" | DailyForecastMarket>("all");
  const [assetQuery, setAssetQuery] = useState("");

  const ordered = useMemo(() => sortByDailyAssetOrder(forecasts.filter((f) => !isPending(f))), [forecasts]);

  const filtered = useMemo(() => {
    return ordered.filter((f) => {
      if (market !== "all" && f.market !== market) return false;
      if (!assetQuery.trim()) return true;
      const q = assetQuery.trim().toLowerCase();
      return (
        f.assetName.toLowerCase().includes(q) ||
        f.symbol.toLowerCase().includes(q) ||
        f.assetId.toLowerCase().includes(q)
      );
    });
  }, [ordered, market, assetQuery]);

  const nextDate = ordered[0]?.forecastForDate ?? "";
  const assetNames = ordered.map((f) => f.assetName);
  const lastUpdated = ordered
    .map((f) => f.updatedAt || f.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <main>
      <Section spacing="lg">
        <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
          <Badge variant="default" className="mb-3">
            {t("home.tomorrowMemberBadge")}
          </Badge>
          <Heading as="h1" size="h2" className="mb-2">
            {t("memberTomorrow.title")}
          </Heading>
          <Text variant="body" color="secondary" className="mb-6 max-w-2xl">
            {t("memberTomorrow.subtitle")}
          </Text>

          {nextDate ? (
            <ScheduleHeader
              nextDateIso={nextDate}
              assetNames={assetNames}
              lastUpdated={lastUpdated ? formatDateTimeChina(lastUpdated) : undefined}
            />
          ) : null}

          <WaveIntelligenceCard />

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMarket(m.id)}
                  className={`rounded-md px-3 py-1.5 text-body-sm transition-colors focus-ring ${
                    market === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground-secondary hover:text-foreground"
                  }`}
                >
                  {isChinese ? m.zh : m.en}
                </button>
              ))}
            </div>
            <input
              value={assetQuery}
              onChange={(e) => setAssetQuery(e.target.value)}
              placeholder={t("memberTomorrow.filterAsset")}
              className="h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body-sm"
              aria-label={t("memberTomorrow.filterAsset")}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((f) => (
              <Card key={f.id} padding="lg" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Text variant="body" weight="semibold">
                      {f.assetName} · {f.symbol}
                    </Text>
                    <Text variant="caption" color="tertiary" className="block">
                      预测日期：{formatDateChina(f.forecastForDate)}
                    </Text>
                    <Text variant="caption" color="tertiary" className="block">
                      目标交易时段：{f.tradingSessionLabel}
                    </Text>
                    <Text variant="caption" color="tertiary" className="block">
                      发布时间：{formatDateTimeChina(f.publishedAt)}
                    </Text>
                    <Text variant="caption" color="tertiary" className="block">
                      下一次更新：{nextUpdateLabelForSymbol(f.symbol)}
                    </Text>
                  </div>
                  <Badge variant="default">{displayDirection(f)}</Badge>
                </div>

                <Text variant="body-sm">{f.summary}</Text>
                {f.probabilities ? (
                  <Text variant="caption" color="tertiary">
                    上涨 {f.probabilities.up}% · 震荡 {f.probabilities.flat}% · 下跌 {f.probabilities.down}%
                  </Text>
                ) : (
                  <Text variant="caption" color="tertiary">
                    {t("home.tomorrowConfidence")}: {f.confidence}%
                  </Text>
                )}
                {f.expectedPath?.length ? (
                  <Text variant="body-sm" color="secondary">
                    盘中运行顺序：{f.expectedPath.join(" → ")}
                  </Text>
                ) : null}
                <PriceLevelsBlock
                  support={f.supportLevels}
                  resistance={f.resistanceLevels}
                  invalidation={f.invalidation}
                  confirmation={f.confirmation}
                  priceSource={f.priceDataSourceLabel}
                  snapshotAt={
                    f.priceSnapshotAtLabel ? formatDateTimeChina(f.priceSnapshotAtLabel) : undefined
                  }
                />
                {f.symbol === "WTI" ? (
                  <Text variant="caption" color="tertiary">
                    行情及验证使用WTI近月连续合约，不代表特定交割月份的现货价格。
                  </Text>
                ) : null}
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Text variant="body" color="secondary" className="mt-8">
              {t("common.emptyFiltered")}
            </Text>
          )}
        </div>
      </Section>
    </main>
  );
}
