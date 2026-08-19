import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ConvictionDetailClient } from "@/components/conviction/ConvictionDetailClient";
import { getConvictionDetailPayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "SPCX Featured Research | MOOX Intelligence",
  description: "Unified SPCX focus dossier with Liu Yao, Qimen, daily rhythm, multi-horizon research and key levels.",
};

export default async function Page() {
  noStore();
  const payload = await getConvictionDetailPayload("spcx");
  if (!payload) notFound();
  return <main><ConvictionDetailClient payload={payload} /></main>;
}
