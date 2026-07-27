"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatCard,
  Text,
} from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { technicalSignalMessageKeys } from "@/lib/formatters/technical-signal";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";
import type { TechnicalSignal, TechnicalVerificationStats } from "@/types/technical-signal";

const badgeVariant = (status: TechnicalSignal["status"]) => {
  if (status === "confirmed" || status === "verified_hit") return "success" as const;
  if (status === "warning" || status === "verified_partial") return "warning" as const;
  if (status === "invalidated" || status === "verified_miss") return "danger" as const;
  return "neutral" as const;
};

export function TechnicalSignalCenter({
  signals,
  stats,
  conflictCount,
  totalSignalCount,
  isMember,
}: {
  signals: TechnicalSignal[];
  stats: TechnicalVerificationStats;
  conflictCount: number;
  totalSignalCount: number;
  isMember: boolean;
}) {
  const { locale } = useLocale();
  const t = useTranslations();
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const filtered = useMemo(
    () =>
      signals
        .filter((signal) => status === "all" || signal.status === status)
        .filter((signal) => type === "all" || signal.signalType === type)
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
    [signals, status, type]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="观察中" value={stats.totalSignals - stats.completedVerifications - signals.filter((signal) => signal.status === "invalidated" || signal.status === "expired").length} />
        <StatCard label={t("technical.currentWarnings")} value={signals.filter((signal) => signal.status === "warning").length} />
        <StatCard label={t("technical.confirmedSignals")} value={signals.filter((signal) => signal.status === "confirmed").length} />
        <StatCard label={t("technical.awaitingVerification")} value={signals.filter((signal) => Boolean(signal.verificationDate) && !signal.outcome).length} />
        <StatCard label={t("technical.timeframeConflicts")} value={conflictCount} />
      </div>

      <Card padding="md" className="grid gap-3 sm:grid-cols-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label={t("technical.currentWarnings")}><SelectValue placeholder={t("common.all")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {["observing", "warning", "confirmed", "invalidated", "expired", "verified_hit", "verified_partial", "verified_miss"].map((value) => (
              <SelectItem key={value} value={value}>{t(`technical.status.${value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger aria-label={t("technical.title")}><SelectValue placeholder={t("common.all")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {[...new Set(signals.map((signal) => signal.signalType))].map((value) => (
              <SelectItem key={value} value={value}>{t(`technical.type.${value}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {signals.length === 0 ? (
        <EmptyState title={t("common.empty")} description={t("technical.noSignals")} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("common.empty")} description={t("common.emptyFiltered")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((signal) => (
            <Card key={signal.id} padding="lg" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <Text variant="body" weight="semibold" className="text-foreground">
                    {pickLocalized(signal.title, locale)}
                  </Text>
                  <Text variant="caption" color="tertiary">{signal.symbol} · {t(technicalSignalMessageKeys.timeframe(signal.timeframe))}</Text>
                </div>
                <Badge variant={badgeVariant(signal.status)}>{t(technicalSignalMessageKeys.status(signal.status))}</Badge>
              </div>
              <Text variant="body-sm" color="secondary">{pickLocalized(signal.summary, locale)}</Text>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Text variant="label" color="tertiary">{t("technical.signalStrength")}</Text><Text variant="mono">{signal.signalStrength ?? "—"}</Text></div>
                <div><Text variant="label" color="tertiary">{t("technical.detectedAt")}</Text><Text variant="caption">{formatLocalizedDate(signal.detectedAt, locale)}</Text></div>
                {signal.verificationDate && <div><Text variant="label" color="tertiary">{t("technical.verificationDate")}</Text><Text variant="caption">{formatLocalizedDate(signal.verificationDate, locale)}</Text></div>}
              </div>
              {signal.priceStructure && <SignalList title={t("technical.priceStructure")} values={[pickLocalized(signal.priceStructure, locale)]} />}
              {signal.indicatorStructure && <SignalList title={t("technical.indicatorStructure")} values={[pickLocalized(signal.indicatorStructure, locale)]} />}
              <SignalList title={t("technical.confirmationConditions")} values={signal.confirmationConditions.map((item) => pickLocalized(item, locale))} />
              <SignalList title={t("technical.invalidationConditions")} values={signal.invalidationConditions.map((item) => pickLocalized(item, locale))} />
            </Card>
          ))}
        </div>
      )}
      {!isMember && totalSignalCount > signals.length && (
        <Card padding="lg" className="flex flex-col gap-2">
          <Text variant="body" weight="semibold">当前共有{totalSignalCount}个周线底背离观察资产</Text>
          <Text variant="body-sm" color="secondary">MoonX提供结构化研究观点与情景推演，不构成针对任何个人的投资建议，也不承诺任何结果。</Text>
          <a href="/pricing" className="text-body-sm text-primary hover:underline">查看会员内容</a>
        </Card>
      )}

      <Card padding="lg" className="flex flex-col gap-3">
        <Text variant="label" color="secondary">{t("technical.awaitingVerification")}</Text>
        <Text variant="body-sm" color="secondary">
          {stats.completedVerifications === 0
            ? t("technical.noSignals")
            : `${stats.completedVerifications}/${stats.totalSignals} · ${t("technical.outcome.hit")}: ${stats.hits} · ${t("technical.outcome.partial")}: ${stats.partials} · ${t("technical.outcome.miss")}: ${stats.misses}`}
        </Text>
        <Text variant="caption" color="tertiary">{t("technical.disclaimer")}</Text>
      </Card>
    </div>
  );
}

function SignalList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="label" color="tertiary">{title}</Text>
      <ul className="flex flex-col gap-1">
        {values.map((value) => <li key={value} className="text-body-sm text-foreground-secondary">• {value}</li>)}
      </ul>
    </div>
  );
}
