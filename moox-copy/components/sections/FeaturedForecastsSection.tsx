import { ForecastCard } from "@/components/cards";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { demoForecasts } from "@/lib/data/demo-content";

export function FeaturedForecastsSection() {
  return (
    <Section id="forecasts" spacing="lg">
      <div className="mb-12 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Featured Forecasts
          </Text>
          <Badge variant="neutral">Demo Content</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Structured forecasts, scored and versioned
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          Every forecast carries its own confidence, evidence, and agreement scores — plus a fixed
          verification date so its accuracy can be checked after the fact.
        </Text>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {demoForecasts.map((forecast) => (
          <ForecastCard key={forecast.id} forecast={forecast} />
        ))}
      </div>
    </Section>
  );
}
