import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import { generateSocialCardsForToday } from "@/lib/social-cards/generate";
import { listSocialCards, listSocialCardsForDate } from "@/lib/social-cards/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const today = getBeijingTodayKey();

  if (date === "today" || !date) {
    const [todayCards, all] = await Promise.all([
      listSocialCardsForDate(today),
      listSocialCards(),
    ]);
    return NextResponse.json({
      today: todayCards,
      history: all.filter((c) => c.forecastDate !== today),
      forecastDate: today,
    });
  }

  const cards = await listSocialCardsForDate(date);
  return NextResponse.json({ today: cards, history: [], forecastDate: date });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action && body.action !== "regenerate") {
      return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
    const result = await generateSocialCardsForToday({ source: "admin" });
    return NextResponse.json({
      ok: true,
      forecastDate: result.forecastDate,
      count: result.count,
      cards: result.cards,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "重新生成失败" },
      { status: 500 }
    );
  }
}
