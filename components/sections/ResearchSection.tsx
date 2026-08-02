import { ResearchCard } from "@/components/cards";
import { Heading, Section, Text } from "@/components/ui";
import { demoResearchArticles } from "@/lib/data/demo-content";

export function ResearchSection() {
  return (
    <Section id="research" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-12 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Research
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Notes on how MOOX thinks about forecasting
        </Heading>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {demoResearchArticles.map((article) => (
          <ResearchCard key={article.id} article={article} />
        ))}
      </div>
    </Section>
  );
}
