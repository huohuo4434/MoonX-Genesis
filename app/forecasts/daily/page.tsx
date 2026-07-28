import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not Found",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Legacy daily forecasts hub — closed to public. */
export default function DailyForecastsGone() {
  notFound();
}
