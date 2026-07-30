import { AlertTriangleIcon, CheckIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Card, Progress, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import { formatLocalizedDate } from "@/lib/utils";
import type { DailyIntelligenceReport as DailyIntelligenceReportData } from "@/lib/data/research-intelligence";

export interface DailyIntelligenceReportProps {
  report: DailyIntelligenceReportData;
}

/** Structured daily research snapshot MoonX produces once frameworks reach consensus on an asset. */
export function DailyIntelligenceReport({ report }: DailyIntelligenceReportProps) {
  const { locale } = useLocale();
  const t = useTranslations();
  const isChinese = locale === "zh-CN";
  const localized = report.id === "btc-2026-07-26"
    ? {
        asset: "比特币",
        keyFactors: [
          "技术结构显示价格在关键支撑位上方形成更高低点。",
          "谐波结构显示价格处于早期推进阶段。",
          "周期结构将本周标记为历史上相对有利的时间窗口。",
        ],
        riskFactors: [
          "临近季末，宏观流动性仍是重要变量。",
          "江恩结构提示存在值得跟踪的短期时间冲突。",
        ],
        finalView: "MoonX 内部框架短期内倾向看涨比特币，其中技术结构与谐波结构的共识最强；鉴于宏观信号分歧，整体置信度为中等。",
      }
    : undefined;

  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Badge variant="outline" className="self-start">
            {t("ui.dailyReport")}
          </Badge>
          <Text variant="body" weight="semibold" className="mt-1 text-h3 text-foreground">
            {isChinese ? localized?.asset ?? report.asset : report.asset} <span className="text-foreground-tertiary">{report.symbol}</span>
          </Text>
          <Text variant="caption" color="tertiary">
            {formatLocalizedDate(report.date, locale)}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Text variant="caption" color="tertiary">
            {t("ui.marketConsensus")}
          </Text>
          <TrendBadge trend={report.marketConsensus} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Progress label={t("ui.bullishScore")} value={report.bullishScore} />
        <Progress label={t("ui.bearishScore")} value={report.bearishScore} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("ui.keyFactors")}
          </Text>
          <ul className="flex flex-col gap-2.5">
            {(isChinese ? localized?.keyFactors ?? report.keyFactors : report.keyFactors).map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <CheckIcon size={14} className="mt-0.5 shrink-0 text-success" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            {t("ui.riskFactors")}
          </Text>
          <ul className="flex flex-col gap-2.5">
            {(isChinese ? localized?.riskFactors ?? report.riskFactors : report.riskFactors).map((factor) => (
              <li key={factor} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                <AlertTriangleIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/[0.08] pt-5">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          {t("ui.finalMoonxView")}
        </Text>
        <Text variant="body-sm" color="secondary">
          {isChinese ? localized?.finalView ?? report.finalView : report.finalView}
        </Text>
      </div>
    </Card>
  );
}
