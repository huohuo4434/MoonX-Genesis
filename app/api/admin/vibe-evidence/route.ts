import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/auth/permissions";
import { refreshVibeEvidence, testVibeConnection } from "@/lib/data/vibe/client";
import { listVibeEvidence } from "@/lib/data/vibe/store";
import { getVibeAssetConfig } from "@/lib/data/vibe/assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  noStore();
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
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
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    assetId?: string;
  };
  if (body.action !== "refresh") {
    return NextResponse.json({ error: "action必须为refresh" }, { status: 400 });
  }
  if (body.assetId && !getVibeAssetConfig(body.assetId)) {
    return NextResponse.json({ error: "未知的重点关注资产" }, { status: 400 });
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
