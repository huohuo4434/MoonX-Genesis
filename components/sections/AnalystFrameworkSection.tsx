import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { ScoreBadge } from "@/components/data";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { listAnalystFrameworks } from "@/lib/data/research-intelligence";

/**
 * Presents MoonX's internal analysis frameworks. Intentionally attributed to
 * MoonX itself rather than any individual analyst.
 */
export async function AnalystFrameworkSection() {
  const frameworks = await listAnalystFrameworks();

  return (
    <Section id="frameworks" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-12 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Analyst Framework
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Seven internal frameworks behind every forecast
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          MoonX reconciles signal from seven internal analysis frameworks rather than relying on
          any single methodology or analyst.
        </Text>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((framework) => (
          <Card key={framework.id} padding="lg" className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <Text variant="body" weight="semibold" className="text-foreground">
                {framework.name}
              </Text>
              <ScoreBadge value={framework.reliabilityScore} />
            </div>
            <Badge variant="outline" className="self-start">
              {framework.category}
            </Badge>
            <Text variant="body-sm" color="secondary">
              {framework.description}
            </Text>
          </Card>
        ))}
      </div>

      <Link
        href="/research"
        className="mt-8 inline-flex items-center gap-1.5 rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring"
      >
        Explore the full framework database
        <ArrowRightIcon size={14} />
      </Link>
    </Section>
  );
}
