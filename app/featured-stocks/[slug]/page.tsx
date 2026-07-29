import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ConvictionDetailClient } from "@/components/conviction/ConvictionDetailClient";
import { getConvictionDetailPayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getConvictionDetailPayload(slug);
  if (!payload) return { title: "资产研究档案 | MOOX" };
  return {
    title: `${payload.public.nameZh}研究档案 | MOOX`,
    description: payload.public.summaryZh.slice(0, 120),
  };
}

export default async function ConvictionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  noStore();
  const { slug } = await params;
  const payload = await getConvictionDetailPayload(slug);
  if (!payload) notFound();

  return (
    <main>
      <ConvictionDetailClient payload={payload} />
    </main>
  );
}
