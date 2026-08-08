import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const metadata: Metadata = {
  title: "SPCX Featured Research V2 | MOOX Intelligence",
  description: "Post-unlock SPCX recalculation with an Aug. 10–14 day-by-day path, weekly/monthly/three-month/one-year/five-year layers, live technical confirmation and a public V1→V2 revision log.",
};

export default function Page() {
  return <SpcxResearchPage language="en" />;
}
