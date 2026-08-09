import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const metadata: Metadata = {
  title: "SPCX 重点研究 V2｜MOOX Intelligence",
  description: "SPCX 解锁后实际K线复算：8/10—8/14逐日路径、周/月/三个月/一年/五年分层、多周期方向共振、技术点位与V1→V2公开修订。",
};

export default function Page() {
  return <SpcxResearchPage language="zh" />;
}
