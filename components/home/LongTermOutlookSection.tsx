import { LongTermOutlookClient } from "@/components/home/LongTermOutlookClient";
import { loadMoonXResearchAsync } from "@/lib/moonx/load-research";

export async function LongTermOutlookSection() {
  const doc = await loadMoonXResearchAsync();
  const aShares = doc.assets.find((asset) => asset.id === "shanghai-composite");
  const hongKong = doc.assets.find((asset) => asset.id === "hang-seng");
  if (!aShares || !hongKong) return null;

  return (
    <section id="long-term" className="border-t border-border/[0.06] py-12 lg:py-16">
      <LongTermOutlookClient
        cards={[
          {
            id: aShares.id,
            titleKey: "home.chinaAShares",
            direction: aShares.direction,
            horizon: aShares.forecastHorizon,
            summary: aShares.localizedSummary,
            windows: aShares.turningWindows.slice(0, 2).map((window_) => ({
              id: window_.id,
              start: window_.startDate,
              end: window_.endDate,
              label: window_.label,
            })),
            risks: aShares.riskConditions.slice(0, 1),
          },
          {
            id: hongKong.id,
            titleKey: "home.chinaHongKong",
            direction: hongKong.direction,
            horizon: hongKong.forecastHorizon,
            summary: hongKong.localizedSummary,
            windows: hongKong.turningWindows.slice(0, 2).map((window_) => ({
              id: window_.id,
              start: window_.startDate,
              end: window_.endDate,
              label: window_.label,
            })),
            risks: hongKong.riskConditions.slice(0, 1),
          },
        ]}
      />
    </section>
  );
}
