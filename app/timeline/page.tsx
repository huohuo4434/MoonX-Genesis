import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { TimelineExplorer } from "@/components/research/TimelineExplorer";
import { ResearchSubnav } from "@/components/research/ResearchSubnav";
import { Heading, Section, Text } from "@/components/ui";
import { shapeTimelineEvents } from "@/lib/access/research-surfaces";
import { listTimelineEvents } from "@/lib/data/long-range-forecasts";

export const metadata: Metadata = {
  title: "Timeline | MOOX",
  description: "Timeline of research windows, scenarios, and verification progress.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TimelinePage() {
  noStore();
  const events = shapeTimelineEvents(await listTimelineEvents());
  return (
    <main>
      <Section spacing="lg">
        <ResearchSubnav />
        <Heading as="h1" size="h2">
          Timeline
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-3xl">
          时间线展示研究窗口、事件与验证状态；不直接替代单日预测结论。
        </Text>
        <div className="mt-8">
          <TimelineExplorer events={events} />
        </div>
      </Section>
    </main>
  );
}
