import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const metadata: Metadata = {
  title: "SPCX 重点研究｜MOOX Intelligence",
  description: "SPCX 解锁后的多周期路径、双老师六爻分析、技术确认与公开验证。",
};

export default function Page() {
  return <SpcxResearchPage language="zh" />;
}
