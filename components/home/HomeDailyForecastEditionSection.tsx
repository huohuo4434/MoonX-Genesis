import { unstable_noStore as noStore } from "next/cache";
import { DailyMarketForecastEditionClient } from "@/components/forecasts/DailyMarketForecastEditionClient";
import { getDailyMarketForecastEditionPayload } from "@/lib/data/daily-market-editions";

export async function HomeDailyForecastEditionSection() {
  noStore();
  const payload = await getDailyMarketForecastEditionPayload();
  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-10">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <DailyMarketForecastEditionClient payload={payload} compact />
      </div>
    </section>
  );
}
