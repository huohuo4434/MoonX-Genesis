import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX Featured Research V2 | MOOX Intelligence",
  description: "SPCX post-unlock research with daily, weekly, monthly and longer-horizon layers plus live technical confirmation.",
};

export default function Page() {
  return <SpcxResearchPage language="en" />;
}
