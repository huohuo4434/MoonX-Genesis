"use client";

import { Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function VerificationMethodDisclosure() {
  const { locale } = useLocale();
  const en = locale === "en";
  const items = en
    ? [
        ["Direction hit", "The actual closing direction matches the locked view."],
        ["Path hit", "The intraday sequence and structure are scored separately."],
        ["Partial hit", "Counts as 0.5 in the weighted hit rate."],
        ["Unverifiable", "Closed market, missing data or inapplicable rules; excluded from the denominator."],
      ]
    : [
        ["方向命中", "实际收盘方向符合锁定判断。"],
        ["路径命中", "按日内结构与先后顺序单独判定。"],
        ["部分命中", "按0.5权重计入加权命中率。"],
        ["不可验证", "休市、数据缺失或规则不适用，不进入分母。"],
      ];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading as="h1" size="h2">{en ? "Public verification" : "公开验证"}</Heading>
          <Text variant="body-sm" color="secondary" className="mt-2 block">
            {en
              ? "Published versions are locked. A result is scored only after the observation window ends and real market data is available. Misses and unverifiable records remain visible."
              : "发布后锁定版本；只在观察期结束并取得真实行情后判定。失败与不可验证记录同样保留。"}
          </Text>
        </div>
        <div className="flex gap-2">
          <a className="flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm" href="/api/public/verification?format=csv">
            {en ? "Download CSV" : "下载CSV"}
          </a>
          <a className="flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm" href="/api/public/verification?format=json">
            {en ? "Download JSON" : "下载JSON"}
          </a>
        </div>
      </div>
      <div className="grid gap-3 text-body-sm md:grid-cols-4">
        {items.map(([title, body]) => (
          <div key={title}>
            <strong>{title}</strong>
            <p className="mt-1 text-foreground-secondary">{body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
