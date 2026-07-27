import { TechnicalSignalsHomeClient } from "./TechnicalSignalsHomeClient";
import { Section } from "@/components/ui";
import { listTechnicalSignals } from "@/lib/data/load-technical-signals";

export async function TechnicalSignalsHomeSection() {
  const signals = await listTechnicalSignals();
  const topSignals = [...signals].sort((a, b) => (b.signalStrength ?? 0) - (a.signalStrength ?? 0)).slice(0, 3);
  return (
    <Section spacing="sm" className="border-t border-border/[0.06]">
      <TechnicalSignalsHomeClient signals={topSignals} />
    </Section>
  );
}
