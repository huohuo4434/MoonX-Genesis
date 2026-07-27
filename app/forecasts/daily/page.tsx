import type { Metadata } from "next";
import { DailyMarketForecastSection } from "@/components/sections/DailyMarketForecastSection";

export const metadata: Metadata = {
  title: "每日市场预测 | MoonX",
  description: "MoonX 下一交易日会员预测与今日公开验证预测。",
};

export default function DailyForecastsPage() {
  return (
    <main>
      <DailyMarketForecastSection />
    </main>
  );
}
