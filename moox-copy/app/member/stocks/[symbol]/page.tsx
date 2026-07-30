import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SLUG_BY_SYMBOL: Record<string, string> = {
  "688825": "cxmt",
  cxmt: "cxmt",
  changxin: "cxmt",
  asteroid: "asteroid",
  aster: "asteroid",
};

/** Legacy member stock detail → conviction research archive. */
export default async function MemberStockDetailRedirect({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const key = symbol.trim().toLowerCase();
  const slug = SLUG_BY_SYMBOL[key] ?? SLUG_BY_SYMBOL[symbol] ?? "cxmt";
  permanentRedirect(`/featured-stocks/${slug}`);
}
