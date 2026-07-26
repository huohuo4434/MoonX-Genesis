import { Section } from "@/components/ui";
import { listTimelineEvents } from "@/lib/data/long-range-forecasts";
import { UpcomingTurningWindowsClient } from "./UpcomingTurningWindowsClient";

const NOW = new Date("2026-07-26");

/** Homepage "Upcoming Turning Windows" — the next handful of near-term timeline events. */
export async function UpcomingTurningWindowsSection() {
  const events = await listTimelineEvents();
  const upcoming = events
    .filter((event) => !event.isLongRange)
    .map((event) => ({ event, ts: new Date(event.date ?? event.start ?? "").getTime() }))
    .filter((entry) => Number.isFinite(entry.ts))
    .sort((a, b) => a.ts - b.ts)
    .filter((entry) => entry.ts >= NOW.getTime() - 1000 * 60 * 60 * 24) // include "today"
    .slice(0, 6)
    .map((entry) => entry.event);

  if (upcoming.length === 0) return null;

  return (
    <Section id="turning-windows" spacing="lg" className="border-t border-border/[0.06]">
      <UpcomingTurningWindowsClient events={upcoming} />
    </Section>
  );
}
