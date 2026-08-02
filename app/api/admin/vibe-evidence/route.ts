import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/permissions";
import { refreshVibeEvidence, testVibeConnection } from "@/lib/data/vibe/client";
import { listVibeEvidence } from "@/lib/data/vibe/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  noStore();
  await requireAdmin();
  const url = new URL(req.url);
  const test = url.searchParams.get("test") === "1";
  const [records, connection] = await Promise.all([
    listVibeEvidence(),
    test ? testVibeConnection() : Promise.resolve(null),
  ]);
  return NextResponse.json(
    { records, connection },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  noStore();
  await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    assetId?: string;
  };
  if (body.action !== "refresh") {
    return NextResponse.json({ error: "action必须为refresh" }, { status: 400 });
  }
  try {
    const result = await refreshVibeEvidence({ assetId: body.assetId });
    const connection = await testVibeConnection();
    return NextResponse.json(
      {
        ok: true,
        records: result.all,
        refreshed: result.refreshed.map((item) => item.assetId),
        connection,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vibe证据刷新失败" },
      { status: 500 }
    );
  }
}
