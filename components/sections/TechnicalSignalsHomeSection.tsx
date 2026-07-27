import { TechnicalSignalsHomeClient } from "./TechnicalSignalsHomeClient";
import { Section } from "@/components/ui";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";
import { aggregateTechnicalSignals } from "@/lib/analysis/technical-signals";

export async function TechnicalSignalsHomeSection() {
  const signals = await listTechnicalSignals();
  const topSignals = [...signals].sort((a, b) => (b.signalStrength ?? 0) - (a.signalStrength ?? 0)).slice(0, 3);
  const assetIds = [...new Set(signals.map((signal) => signal.assetId))];
  const conflicts = assetIds.filter((assetId) => aggregateTechnicalSignals(signals.filter((signal) => signal.assetId === assetId)).conflictLevel !== "none").length;
  return (
    <Section spacing="sm" className="border-t border-border/[0.06]">
      <TechnicalSignalsHomeClient signals={topSignals} warningCount={signals.filter((signal) => signal.status === "warning").length} confirmedCount={signals.filter((signal) => signal.status === "confirmed").length} conflictCount={conflicts} />
    </Section>
  );
}
