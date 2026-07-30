"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "正在发布";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

/**
 * Keeps the homepage release card alive across the 20:00 Beijing boundary.
 * It never fetches forecast data itself; router.refresh() re-runs the server ACL.
 */
export function TomorrowReleaseWatcher({
  plannedPublishAt,
  published,
}: {
  plannedPublishAt: string;
  published: boolean;
}) {
  const router = useRouter();
  const publishMs = useMemo(() => Date.parse(plannedPublishAt), [plannedPublishAt]);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, publishMs - Date.now()));

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, publishMs - Date.now()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [publishMs]);

  useEffect(() => {
    if (published) return;

    const now = Date.now();
    let releaseTimer: number | undefined;
    let pollTimer: number | undefined;

    if (now < publishMs) {
      releaseTimer = window.setTimeout(() => {
        router.refresh();
        pollTimer = window.setInterval(() => router.refresh(), 30_000);
      }, Math.max(0, publishMs - now) + 1_000);
    } else {
      router.refresh();
      pollTimer = window.setInterval(() => router.refresh(), 30_000);
    }

    // Stop automatic polling 15 minutes after the planned release.
    const stopTimer = window.setTimeout(
      () => {
        if (pollTimer) window.clearInterval(pollTimer);
      },
      Math.max(60_000, publishMs + 15 * 60_000 - now)
    );

    return () => {
      if (releaseTimer) window.clearTimeout(releaseTimer);
      if (pollTimer) window.clearInterval(pollTimer);
      window.clearTimeout(stopTimer);
    };
  }, [publishMs, published, router]);

  if (published) {
    return <span>已发布</span>;
  }

  return <span>{remainingMs > 0 ? `距离发布还有 ${formatRemaining(remainingMs)}` : "正在同步，页面将自动刷新"}</span>;
}
