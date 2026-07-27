import {
  TomorrowForecastLocked,
  TomorrowForecastMember,
} from "@/components/home/TomorrowForecastViews";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";

/** Server section: never passes full forecasts to non-member clients. */
export async function HomeTomorrowSection() {
  const payload = await getTomorrowSectionPayload();

  if (payload.mode === "locked") {
    return (
      <TomorrowForecastLocked
        summary={payload.summary}
        pricingHref={payload.pricingHref}
        memberHref={payload.memberHref}
      />
    );
  }

  return (
    <TomorrowForecastMember
      summary={payload.summary}
      forecasts={payload.forecasts}
      detailHref={payload.detailHref}
      isPreviewGate={payload.isPreviewGate}
    />
  );
}
