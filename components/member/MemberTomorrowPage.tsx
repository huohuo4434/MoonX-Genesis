"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LockIcon } from "@/components/icons";
import { Badge, Button, Card, Heading, Section, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatForecastDateEn, formatForecastDateZh } from "@/lib/calendar/next-trading-day";
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

export function MemberTomorrowLockedPage({ summary }: { summary: TomorrowForecastPublicSummary }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";

  return (
    <main>
      <Section spacing="lg">
        <Card padding="lg" className="mx-auto flex max-w-2xl flex-col gap-4">
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
          <Text variant="body-sm" color="secondary">
            {t("home.tomorrowNextSession")}
            {isChinese ? formatForecastDateZh(summary.nextDateIso) : formatForecastDateEn(summary.nextDateIso)}
          </Text>
          <Text variant="body-sm" color="secondary">
            {t("home.tomorrowCoveredAssets")}
            {summary.assetNames.join(isChinese ? "、" : ", ")}
          </Text>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="primary">
              <Link href="/pricing">{t("home.tomorrowUnlockCta")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/member-preview">{t("memberTomorrow.previewGate")}</Link>
            </Button>
          </div>
          <Text variant="caption" color="tertiary">
            {t("memberTomorrow.authNote")}
          </Text>
        </Card>
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

  const filtered = useMemo(() => {
    return forecasts.filter((f) => {
      if (market !== "all" && f.market !== market) return false;
      if (!assetQuery.trim()) return true;
      const q = assetQuery.trim().toLowerCase();
      return (
        f.assetName.toLowerCase().includes(q) ||
        f.symbol.toLowerCase().includes(q) ||
        f.assetId.toLowerCase().includes(q)
      );
    });
  }, [forecasts, market, assetQuery]);

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
          <Text variant="body" color="secondary" className="mb-8 max-w-2xl">
            {t("memberTomorrow.subtitle")}
          </Text>

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
            {filtered.map((f) => {
              const pending = isPending(f);
              return (
                <Card key={f.id} padding="lg" className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Text variant="body" weight="semibold">
                        {f.assetName} · {f.symbol}
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {t("home.tomorrowNextSession")}
                        {isChinese
                          ? formatForecastDateZh(f.forecastForDate)
                          : formatForecastDateEn(f.forecastForDate)}
                        {" · "}
                        {f.tradingSessionLabel}
                      </Text>
                    </div>
                    <Badge variant={pending ? "neutral" : "default"}>
                      {pending ? t("home.tomorrowResearchPending") : f.direction}
                    </Badge>
                  </div>

                  {!pending && (
                    <>
                      <Text variant="body-sm">{f.summary}</Text>
                      <Text variant="caption" color="tertiary">
                        {t("home.tomorrowConfidence")}: {f.confidence}% · {t("home.tomorrowVersion")} v
                        {f.version}
                      </Text>
                      {f.expectedPath?.length ? (
                        <Text variant="body-sm" color="secondary">
                          {t("home.tomorrowPath")}: {f.expectedPath.join(" → ")}
                        </Text>
                      ) : null}
                      {(f.supportLevels?.length || f.resistanceLevels?.length || f.targetLevels?.length) && (
                        <div className="grid gap-1 text-body-sm text-foreground-secondary">
                          {f.supportLevels?.length ? (
                            <p>
                              {t("home.tomorrowSupport")}: {f.supportLevels.join(", ")}
                            </p>
                          ) : null}
                          {f.resistanceLevels?.length ? (
                            <p>
                              {t("home.tomorrowResistance")}: {f.resistanceLevels.join(", ")}
                            </p>
                          ) : null}
                          {f.targetLevels?.length ? (
                            <p>
                              {t("home.tomorrowTargets")}: {f.targetLevels.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      )}
                      {f.keyTimeWindows?.length ? (
                        <ul className="space-y-1 text-body-sm text-foreground-secondary">
                          {f.keyTimeWindows.map((w) => (
                            <li key={w.label}>
                              {w.label}: {w.description}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {f.catalysts?.length ? (
                        <Text variant="body-sm" color="secondary">
                          {t("home.tomorrowCatalysts")}: {f.catalysts.join(isChinese ? "；" : "; ")}
                        </Text>
                      ) : null}
                      {f.risks?.length ? (
                        <Text variant="body-sm" color="secondary">
                          {t("home.tomorrowRisks")}: {f.risks.join(isChinese ? "；" : "; ")}
                        </Text>
                      ) : null}
                      {f.invalidation ? (
                        <Text variant="body-sm" color="secondary">
                          {t("home.tomorrowInvalidation")}: {f.invalidation}
                        </Text>
                      ) : null}
                      {f.evidenceRecordIds?.length ? (
                        <Text variant="caption" color="tertiary">
                          {t("memberTomorrow.evidence")}: {f.evidenceRecordIds.join(", ")}
                        </Text>
                      ) : null}
                      {f.revisionHistory?.length ? (
                        <div className="border-t border-border/[0.08] pt-2">
                          <Text variant="caption" color="tertiary">
                            {t("home.tomorrowRevisions")}
                          </Text>
                          <ul className="mt-1 space-y-1 text-caption text-foreground-secondary">
                            <li>
                              {t("memberTomorrow.initialVersion")} v1
                            </li>
                            {f.revisionHistory.map((r) => (
                              <li key={`${r.version}-${r.updatedAt}`}>
                                {t("memberTomorrow.latestRevision")} v{r.version}: {r.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <Text variant="caption" color="tertiary">
                          {t("memberTomorrow.initialVersion")} v{f.version}
                        </Text>
                      )}
                    </>
                  )}

                  {pending && (
                    <Text variant="body-sm" color="secondary">
                      {t("home.tomorrowResearchPending")}
                    </Text>
                  )}

                  <Text variant="caption" color="tertiary">
                    {t("home.tomorrowLastUpdated")}{" "}
                    {new Date(f.updatedAt ?? f.publishedAt).toLocaleString(
                      isChinese ? "zh-CN" : "en-US"
                    )}
                    {f.reviewedBy ? ` · reviewed by ${f.reviewedBy}` : ""}
                    {f.publishedBy ? ` · published by ${f.publishedBy}` : ""}
                  </Text>
                </Card>
              );
            })}
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
