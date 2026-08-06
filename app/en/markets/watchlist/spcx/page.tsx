import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const metadata: Metadata = {
  title: "SPCX Featured Research | MOOX Intelligence",
  description: "A locked multi-horizon SPCX roadmap using Mr. Yi K’s two complementary Liu Yao frameworks, live technical confirmation and public verification.",
};

export default function Page() {
  return <SpcxResearchPage language="en" />;
}
