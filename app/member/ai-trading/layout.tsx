import type { ReactNode } from "react";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiTradingResearchLayout({ children }: { children: ReactNode }) {
  // Preserve the request-memoized member boundary at every member layout.
  // The child page renders the appropriate preview/device gate.
  await getMemberDevicePageAccess();
  // Remote exchange reads are intentionally moved behind the first paint.
  return <>{children}</>;
}
