import type { Metadata } from "next";
import SpcxResearchPage from "@/components/conviction/SpcxResearchPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX 重点研究｜MOOX Intelligence",
  description: "SPCX会员专题：多周期研究、解锁后复盘、逐日路径与技术执行参考。",
};

export default function Page() {
  return <SpcxResearchPage language="zh" />;
}
