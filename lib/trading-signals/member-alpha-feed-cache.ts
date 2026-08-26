import "server-only";

import { unstable_cache } from "next/cache";
import { loadTodayForecastRows } from "@/lib/prediction-access-server";
import { getMemberMultiViewSnapshot } from "@/lib/trading-signals/member-multi-view.server";

const readSharedAlphaFeed = unstable_cache(
  async () => {
    const now = new Date();
    const [snapshot, todayForecasts] = await Promise.all([
      getMemberMultiViewSnapshot(now).catch(() => null),
      loadTodayForecastRows(now).catch(() => []),
    ]);
    return { snapshot, todayForecasts };
  },
  ["member-alpha-feed-v720115"],
  { revalidate: 60 },
);

/** Shared data only; member authentication deliberately stays outside. */
export async function getCachedMemberAlphaFeed() {
  return readSharedAlphaFeed();
}
