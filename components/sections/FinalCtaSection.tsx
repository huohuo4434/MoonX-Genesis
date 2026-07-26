import { Button, Heading, Section, Text } from "@/components/ui";

export function FinalCtaSection() {
  return (
    <Section spacing="lg" className="border-t border-border/[0.06]">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/[0.08] bg-surface px-6 py-3xl text-center sm:px-16">
        <Heading as="h2" size="h1" className="max-w-2xl">
          Every forecast should earn trust.
        </Heading>
        <Text variant="body" color="secondary" className="max-w-xl">
          Explore forecasts built on structured evidence, or read the methodology behind how
          they&rsquo;re scored and verified.
        </Text>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <a href="#forecasts">Start Exploring</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#methodology">Read Methodology</a>
          </Button>
        </div>
      </div>
    </Section>
  );
}
