import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { hasConvictionFullAccess } from "@/lib/data/conviction/access-mode";
import { getConvictionDetailPayload } from "@/lib/data/conviction/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Member forecast for a conviction asset — server auth required. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  noStore();
  const access = await getAccessUser();
  if (!access.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasConvictionFullAccess(access)) {
    return NextResponse.json({ error: "Membership required" }, { status: 403 });
  }

  const { slug } = await ctx.params;
  const payload = await getConvictionDetailPayload(slug);
  if (!payload || payload.mode !== "fullAccess" || !payload.forecast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      slug,
      forecast: payload.forecast,
      isAdmin: payload.isAdmin,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
}
