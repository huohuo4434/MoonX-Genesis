import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPublicAccuracyHistory } from "@/lib/accuracy/get-public-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public historical accuracy API.
 * Server-filtered: past verified only — never today / pending / future.
 */
export async function GET() {
  noStore();
  const payload = await getPublicAccuracyHistory();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
