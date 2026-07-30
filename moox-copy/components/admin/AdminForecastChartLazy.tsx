"use client";

import nextDynamic from "next/dynamic";
import { Card, Text } from "@/components/ui";
import type { LongTermForecastChart } from "@/types/long-term-forecast-chart";

const Chart = nextDynamic(
  () => import("@/components/admin/ForecastCandlestickChart").then((m) => m.ForecastCandlestickChart),
  {
    ssr: false,
    loading: () => (
      <Card padding="lg">
        <Text variant="body-sm" color="secondary">
          正在加载预测K线图…
        </Text>
      </Card>
    ),
  }
);

export function AdminForecastChartLazy({ chart }: { chart: LongTermForecastChart }) {
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Chart chart={chart} />
    </div>
  );
}
