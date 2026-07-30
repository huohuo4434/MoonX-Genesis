import { NextResponse, type NextRequest } from "next/server";
import { bootstrapAdminAccount } from "@/lib/auth/bootstrap-admin-password";

/** One-time admin bootstrap — requires CRON_SECRET or MOONX_ADMIN_INITIAL_PASSWORD bearer token. */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const adminPassword = process.env.MOONX_ADMIN_INITIAL_PASSWORD;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const authorized =
    (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.MOONX_ADMIN_EMAIL ?? "jackzwin999@gmail.com";
  try {
    const result = await bootstrapAdminAccount(email);
    return NextResponse.json({
      ok: true,
      email: result.email,
      role: result.role,
      created: result.created,
      updated: result.updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
