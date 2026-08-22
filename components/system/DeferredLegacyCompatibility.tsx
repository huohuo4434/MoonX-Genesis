"use client";

// MOOX_V7208_DEFER_LEGACY_COMPAT

import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DeferredMemberWelcomeGuide = lazy(() =>
  import("@/components/onboarding/MemberWelcomeGuide").then((mod) => ({ default: mod.MemberWelcomeGuide })),
);
const DeferredDirectionGuard = lazy(() =>
  import("@/components/system/PlainLanguageDirectionGuard").then((mod) => ({ default: mod.PlainLanguageDirectionGuard })),
);
const DeferredTomorrowFallback = lazy(() =>
  import("@/components/home/TomorrowViewFallback").then((mod) => ({ default: mod.TomorrowViewFallback })),
);
const DeferredWatchlistFallback = lazy(() =>
  import("@/components/watchlist/WatchlistDailyDomFallback").then((mod) => ({ default: mod.WatchlistDailyDomFallback })),
);

export function DeferredLegacyCompatibility() {
  const pathname = usePathname() ?? "/";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (!cancelled) setReady(true);
    };
    const idle = window.requestIdleCallback?.(activate, { timeout: 1_200 });
    const timer = idle == null ? window.setTimeout(activate, 700) : null;
    return () => {
      cancelled = true;
      if (idle != null) window.cancelIdleCallback?.(idle);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;
  const home = pathname === "/";
  const watchlist = /\/featured-stocks\//.test(pathname);

  return (
    <Suspense fallback={null}>
      <DeferredMemberWelcomeGuide />
      {!watchlist ? <DeferredDirectionGuard key={`direction-${pathname}`} /> : null}
      {home ? <DeferredTomorrowFallback /> : null}
      {watchlist ? <DeferredWatchlistFallback key={`watchlist-${pathname}`} /> : null}
    </Suspense>
  );
}
