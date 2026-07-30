import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy member stocks list → Conviction List. */
export default function MemberStocksRedirectPage() {
  permanentRedirect("/featured-stocks");
}
