import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ConvictionDetailClient } from "@/components/conviction/ConvictionDetailClient";
import { getConvictionDetailPayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX 重点研究｜MOOX Intelligence",
  description: "SPCX统一重点关注档案：六爻、奇门、逐日节奏、多周期研究与关键技术位。",
};

export default async function Page() {
  noStore();
  const payload = await getConvictionDetailPayload("spcx");
  if (!payload) notFound();
  return <main><ConvictionDetailClient payload={payload} /></main>;
}
