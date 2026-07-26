import type { Metadata } from "next";
import { TimelineExplorer } from "@/components/research";
import { PageHeaderIntl } from "@/components/layout";
import { Section } from "@/components/ui";
import { listTimelineEvents } from "@/lib/data/long-range-forecasts";

export const metadata: Metadata = {
  title: "Timeline",
  description: "A unified MoonX timeline spanning 2026 to 2035, covering key scenario events and turning windows.",
};

export default async function TimelinePage() {
  const events = await listTimelineEvents();

  return (
    <main>
      <Section spacing="lg">
        <PageHeaderIntl titleKey="timeline.title" subtitleKey="timeline.subtitle" badgeKey="nav.timeline" />
      </Section>

      <Section spacing="lg" className="border-t border-border/[0.06]">
        <TimelineExplorer events={events} />
      </Section>
    </main>
  );
}
