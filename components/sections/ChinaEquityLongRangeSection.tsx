import { Section } from "@/components/ui";
import { getResearchRecord } from "@/lib/data/research-records";
import { ChinaEquityLongRangeClient } from "./ChinaEquityLongRangeClient";

/** A-share + Hang Seng TECH long-range view — not broad Hong Kong market / HSI. */
export async function ChinaEquityLongRangeSection() {
  const [aShares, hstech] = await Promise.all([
    getResearchRecord("A-SH-2026-0727-ORACLE-001"),
    getResearchRecord("HSTECH-2026-0727-ORACLE-001"),
  ]);

  if (!aShares || !hstech) return null;

  return (
    <Section id="china-equity" spacing="lg" className="border-t border-border/[0.06]">
      <ChinaEquityLongRangeClient aShares={aShares} hstech={hstech} />
    </Section>
  );
}
