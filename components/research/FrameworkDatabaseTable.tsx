"use client";

import { ScoreBadge } from "@/components/data";
import { Badge, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";
import type { AnalystFramework } from "@/lib/data/research-intelligence";
import { formatLocalizedDate } from "@/lib/utils";

export interface FrameworkDatabaseTableProps {
  frameworks: AnalystFramework[];
}

const FRAMEWORK_ZH: Record<string, { name: string; category: string; description: string }> = {
  "oracle-six-yao": { name: "六爻", category: "象数体系", description: "MoonX 用于建模市场结构周期变化与转换点的结构化象数框架。" },
  "cycle-structure": { name: "周期结构", category: "时间与周期", description: "研究历史数据中反复出现的时间间隔、高点、低点与转折窗口。" },
  "gann-structure": { name: "江恩结构", category: "时间与周期", description: "运用几何时间与价格周期分析，界定潜在的拐点窗口。" },
  "harmonic-structure": { name: "谐波结构", category: "价格结构", description: "识别价格行为中重复出现的结构波段与谐波形态，为潜在转折点提供背景。" },
  "market-flow-risk": { name: "市场资金流与风险", category: "资金流与风险", description: "跟踪资金流、持仓以及 ETF／机构活动，识别可能与其他框架相冲突的风险。" },
  "macro-capital-cycle": { name: "宏观资本周期", category: "宏观", description: "评估宏观资本配置与板块轮动趋势对整体市场走势的影响。" },
  "technical-structure": { name: "技术结构", category: "价格结构", description: "以经典价格与成交量结构交叉验证其他框架发出的信号。" },
};

/** Tabular view of the internal analyst framework database. */
export function FrameworkDatabaseTable({ frameworks }: FrameworkDatabaseTableProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const isChinese = locale === "zh-CN";
  return (
    <div className="overflow-x-auto rounded-lg border border-border/[0.08]">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/[0.08] bg-surface/60">
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.frameworkDatabase")}
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.category")}
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.reliability")}
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.weight")}
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.description")}
              </Text>
            </th>
            <th scope="col" className="p-lg">
              <Text variant="label" color="tertiary" className="uppercase tracking-wide">
                {t("ui.updated")}
              </Text>
            </th>
          </tr>
        </thead>
        <tbody>
          {frameworks.map((framework) => {
            const localized = isChinese ? FRAMEWORK_ZH[framework.id] : undefined;
            return (
              <tr key={framework.id} className="border-b border-border/[0.06] last:border-0 hover:bg-surface/40">
              <td className="p-lg align-top">
                <Text variant="body-sm" weight="semibold" className="text-foreground">
                  {localized?.name ?? framework.name}
                </Text>
              </td>
              <td className="p-lg align-top">
                <Badge variant="outline">{localized?.category ?? framework.category}</Badge>
              </td>
              <td className="p-lg align-top">
                <ScoreBadge value={framework.reliabilityScore} />
              </td>
              <td className="p-lg align-top">
                <Text variant="mono" className="text-foreground-secondary">
                  {framework.weight}%
                </Text>
              </td>
              <td className="p-lg align-top max-w-sm">
                <Text variant="body-sm" color="secondary">
                  {localized?.description ?? framework.description}
                </Text>
              </td>
              <td className="p-lg align-top">
                <Text variant="caption" color="tertiary" className="font-mono">
                  {formatLocalizedDate(framework.updatedAt, locale)}
                </Text>
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
