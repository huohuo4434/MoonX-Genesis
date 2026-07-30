/**
 * Admin-only Wave evidence browser.
 * MUST NOT be imported by /member/tomorrow or any daily forecast surface.
 */
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { Badge, Card, Text, Heading } from "@/components/ui";

type WavePrediction = {
  id: string;
  marketName: string;
  marketCode: string;
  direction: string;
  summary: string;
  supportLevels?: number[];
  resistanceLevels?: number[];
  waveLabel?: string | null;
  timeframe?: string;
};

type WaveRanking = {
  weightPercent: number;
};

/** Admin / research evidence only — never mount on member tomorrow page. */
export function WaveIntelligenceCard() {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN" || locale === "zh-TW";
  const [predictions, setPredictions] = useState<WavePrediction[]>([]);
  const [ranking, setRanking] = useState<WaveRanking | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/wave/latest?limit=8", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/wave/ranking", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([latest, rank]) => {
        if (cancelled) return;
        setPredictions(Array.isArray(latest?.data) ? latest.data : []);
        setRanking(Array.isArray(rank?.data) && rank.data[0] ? rank.data[0] : null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-8 rounded-xl border border-border/[0.12] bg-surface/60 p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-caption uppercase tracking-[0.18em] text-foreground-tertiary">
            {t("wave.eyebrow")}
          </div>
          <Heading as="h2" size="h3" className="mt-1">
            {t("wave.title")}
          </Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 max-w-xl">
            {t("wave.subtitle")}
          </Text>
        </div>
        <div className="rounded-lg border border-border/[0.12] px-4 py-2 text-right">
          <div className="text-caption text-foreground-tertiary">{t("wave.dynamicWeight")}</div>
          <div className="text-lg font-semibold tabular-nums">
            {ranking ? `${ranking.weightPercent}%` : "5.0%"}
          </div>
          <div className="text-caption text-foreground-tertiary">{t("wave.weightRange")}</div>
        </div>
      </div>

      {!loaded ? (
        <Text variant="body-sm" color="tertiary">
          {t("wave.loading")}
        </Text>
      ) : predictions.length === 0 ? (
        <Text variant="body-sm" color="secondary">
          {t("wave.empty")}
        </Text>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {predictions.map((x) => (
            <Card key={x.id} padding="md" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text variant="body" weight="semibold">
                  {x.marketName}
                  <span className="ml-2 text-caption font-normal text-foreground-tertiary">
                    {x.marketCode}
                  </span>
                </Text>
                <Badge variant="outline">{t(`wave.direction.${x.direction}`)}</Badge>
              </div>
              {x.waveLabel ? (
                <Text variant="caption" color="tertiary">
                  {x.waveLabel}
                  {x.timeframe ? ` · ${x.timeframe}` : ""}
                </Text>
              ) : null}
              <Text variant="body-sm" color="secondary">
                {x.summary}
              </Text>
              <Text variant="caption" color="tertiary">
                {isChinese ? "支撑" : "Support"}:{" "}
                {Array.isArray(x.supportLevels) && x.supportLevels.length
                  ? x.supportLevels.join(" / ")
                  : "—"}
              </Text>
              <Text variant="caption" color="tertiary">
                {isChinese ? "压力" : "Resistance"}:{" "}
                {Array.isArray(x.resistanceLevels) && x.resistanceLevels.length
                  ? x.resistanceLevels.join(" / ")
                  : "—"}
              </Text>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
