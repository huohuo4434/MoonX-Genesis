import { unstable_noStore as noStore } from "next/cache";
import { getTomorrowSectionPayload } from "@/lib/data/tomorrow-forecast-access";

/** Homepage tomorrow module — renders nothing unless 20:00+ and PUBLISHED. */
export async function HomeTomorrowSection() {
  noStore();
  const payload = await getTomorrowSectionPayload();
  if (payload.mode === "hidden") return null;
  // Full member content lives on /member/tomorrow — homepage stays silent (no teaser shells).
  return null;
}
