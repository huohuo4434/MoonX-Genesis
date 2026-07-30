import { Section } from "@/components/ui";
import { getAltcoinRotationMonitorData } from "@/lib/data/altcoin-rotation";
import { getRiskDisclaimer } from "@/lib/data/intelligence-snapshot";
import { AltcoinRotationMonitorClient } from "./AltcoinRotationMonitorClient";

/** Full Altcoin Rotation Monitor on the Research Intelligence page. */
export async function AltcoinRotationMonitorSection() {
  const [data, disclaimer] = await Promise.all([getAltcoinRotationMonitorData(), getRiskDisclaimer()]);
  if (!data) return null;

  return (
    <Section id="altcoin-rotation" spacing="lg" className="border-t border-border/[0.06]">
      <AltcoinRotationMonitorClient theme={data.theme} doge={data.doge} shib={data.shib} disclaimer={disclaimer} />
    </Section>
  );
}
