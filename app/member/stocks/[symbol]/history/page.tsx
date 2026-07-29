import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SLUG_BY_SYMBOL: Record<string, string> = {
  "688825": "cxmt",
  cxmt: "cxmt",
  asteroid: "asteroid",
};

/** Legacy history route → research archive (history section). */
export default async function MemberStockHistoryRedirect({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const key = symbol.trim().toLowerCase();
  const slug = SLUG_BY_SYMBOL[key] ?? "cxmt";
  permanentRedirect(`/featured-stocks/${slug}`);
}
