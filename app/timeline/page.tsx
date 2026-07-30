import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { TimelineExplorer } from "@/components/research/TimelineExplorer";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { Heading, Section, Text } from "@/components/ui";
import { shapeTimelineEvents } from "@/lib/access/research-surfaces";
import { listTimelineEvents } from "@/lib/data/long-range-forecasts";

export const metadata: Metadata = {
  title: "Timeline | MOOX",
  description: "Internal timeline.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TimelinePage() {
  noStore();
  await requireAdminOrNotFound();
  const events = shapeTimelineEvents(await listTimelineEvents());
  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Timeline
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          内部时间线。不对公众开放。
        </Text>
        <div className="mt-8">
          <TimelineExplorer events={events} />
        </div>
      </Section>
    </main>
  );
}
