import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX Featured Research | MOOX Intelligence",
  description: "Member SPCX dossier with multi-horizon research, post-unlock review, daily path and technical execution context.",
};

export default function Page() {
  return <SpcxResearchPage language="en" />;
}
