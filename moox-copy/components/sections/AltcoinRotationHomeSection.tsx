import { Section } from "@/components/ui";
import { getAltcoinRotationTheme } from "@/lib/data/altcoin-rotation";
import { AltcoinRotationHomeClient } from "./AltcoinRotationHomeClient";

/** Compact homepage card for the Altcoin Rotation theme. */
export async function AltcoinRotationHomeSection() {
  const theme = await getAltcoinRotationTheme();
  if (!theme) return null;

  return (
    <Section spacing="md" className="border-t border-border/[0.06]">
      <AltcoinRotationHomeClient theme={theme} />
    </Section>
  );
}
