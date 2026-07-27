import { NextResponse, type NextRequest } from "next/server";
import { bootstrapAdminAccount } from "@/lib/auth/admin-bootstrap";

/** One-time admin bootstrap — requires CRON_SECRET bearer token. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.MOONX_ADMIN_EMAILS?.split(",")[0]?.trim() ?? "jackzwin999@gmail.com";
  try {
    const result = await bootstrapAdminAccount(email);
    return NextResponse.json({ ok: true, email, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
