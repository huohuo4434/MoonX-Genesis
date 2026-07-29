import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";
import {
  getMethodologyConfig,
  updateMethodologyModule,
} from "@/lib/methodology/store";
import type { MethodologyModuleId } from "@/lib/methodology/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  const access = await getAccessUser();
  if (!access.isAdmin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const config = await getMethodologyConfig();
  return NextResponse.json({ ok: true, config }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  noStore();
  const access = await getAccessUser();
  if (!access.isAdmin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  const body = (await request.json()) as {
    id?: MethodologyModuleId;
    patch?: Record<string, unknown>;
  };
  if (!body.id || !body.patch) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const config = await updateMethodologyModule(body.id, {
    enabled: typeof body.patch.enabled === "boolean" ? body.patch.enabled : undefined,
    publicDisplay:
      typeof body.patch.publicDisplay === "boolean" ? body.patch.publicDisplay : undefined,
    nameZh: typeof body.patch.nameZh === "string" ? body.patch.nameZh : undefined,
    nameEn: typeof body.patch.nameEn === "string" ? body.patch.nameEn : undefined,
    summaryZh: typeof body.patch.summaryZh === "string" ? body.patch.summaryZh : undefined,
    summaryEn: typeof body.patch.summaryEn === "string" ? body.patch.summaryEn : undefined,
    weightRangeZh:
      typeof body.patch.weightRangeZh === "string" ? body.patch.weightRangeZh : undefined,
    weightRangeEn:
      typeof body.patch.weightRangeEn === "string" ? body.patch.weightRangeEn : undefined,
  });
  return NextResponse.json({ ok: true, config }, { headers: { "Cache-Control": "no-store" } });
}
