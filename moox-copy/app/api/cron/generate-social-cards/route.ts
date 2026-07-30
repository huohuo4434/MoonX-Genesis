import { NextResponse, type NextRequest } from "next/server";
import { generateSocialCardsForToday } from "@/lib/social-cards/generate";

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Beijing 00:10 → UTC 16:10 previous calendar day (CST = UTC+8).
 * Scheduled in vercel.json as `10 16 * * *`.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateSocialCardsForToday({ source: "cron" });
    return NextResponse.json({
      ok: true,
      forecastDate: result.forecastDate,
      count: result.count,
      cardIds: result.cards.map((c) => c.id),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cron failed" },
      { status: 500 }
    );
  }
}
