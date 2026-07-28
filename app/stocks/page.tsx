import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy public stocks hub → member stocks surface. */
export default function StocksRedirect() {
  redirect("/member/stocks");
}
