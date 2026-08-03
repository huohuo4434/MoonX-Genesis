"use client";

import { Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function VerificationEmptyState() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <Card padding="lg" className="mt-6">
      <Heading as="h2" size="h3">{en ? "Verification data progress" : "验证数据积累进度"}</Heading>
      <Text variant="body-sm" color="secondary" className="mt-3 block max-w-3xl">
        {en
          ? "Daily and weekly forecasts enter the statistics only after their observation window ends and real market data is available. Published versions remain locked, and misses, partial hits and unverifiable records are retained. No completed sample is available yet."
          : "日度与周度预测都必须等观察周期结束并取得真实行情后才进入统计。发布版本会保持锁定，失败、部分命中和无法验证记录同样保留；当前尚无完成验证的样本。"}
      </Text>
    </Card>
  );
}
