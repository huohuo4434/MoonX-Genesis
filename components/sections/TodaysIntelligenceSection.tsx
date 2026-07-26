import { IntelligenceCard } from "@/components/cards";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { demoAssetIntelligence } from "@/lib/data/demo-content";

/** Premium dashboard snapshot of MoonX-tracked assets — replaces the marketing ticker strip. */
export function TodaysIntelligenceSection() {
  return (
    <Section id="markets" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Today&rsquo;s Intelligence
          </Text>
          <Badge variant="neutral">Demo Data</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">
          A snapshot across MoonX-tracked assets
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          Current status, forecast period, and evidence strength for each asset MoonX actively
          models.
        </Text>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {demoAssetIntelligence.map((asset) => (
          <IntelligenceCard key={asset.id} asset={asset} />
        ))}
      </div>

      <Text variant="caption" color="tertiary" className="mt-6">
        Demo values shown for illustration only — not live market data.
      </Text>
    </Section>
  );
}
