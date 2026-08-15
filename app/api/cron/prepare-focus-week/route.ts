import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.VERCEL !== "1";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: NextRequest): Promise<Response> {
  if (!authorizeCron(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { runFocusWeekRouteHandler } = await import("@/lib/data/conviction/focus-week-route-handler");
  return runFocusWeekRouteHandler({ authorized: true });
}

export async function GET(request: NextRequest): Promise<Response> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handle(request);
}
