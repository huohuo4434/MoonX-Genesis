import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX 重点研究 V2｜MOOX Intelligence",
  description: "SPCX 解锁后实际K线复算：逐日、周、月与中长期分层研究，以及动态技术确认。",
};

export default function Page() {
  return <SpcxResearchPage language="zh" />;
}
