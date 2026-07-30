import { NextResponse } from "next/server";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { getMemberStockDetailPayload } from "@/lib/data/member-stocks/access";

/**
 * Member stock detail API — strips analysis fields for non-members.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params;
  const user = await getMemberUserContext();
  const payload = await getMemberStockDetailPayload(symbol);

  if (!payload) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (payload.mode === "locked" || !user.isMember) {
    return NextResponse.json({
      mode: "locked",
      stockId: payload.mode === "locked" ? payload.card.stockId : payload.stock.stockId,
      name: payload.mode === "locked" ? payload.card.name : payload.stock.name,
      symbol: payload.mode === "locked" ? payload.card.symbol : payload.stock.symbol,
      marketLabel: payload.mode === "locked" ? payload.card.marketLabel : payload.stock.marketLabel,
      tags: payload.mode === "locked" ? payload.card.tags : payload.stock.tags,
      analysisReady: true,
      locked: true,
      hasToday: payload.mode === "locked" ? payload.hasToday : Boolean(payload.today),
      hasTomorrow: payload.mode === "locked" ? payload.hasTomorrow : Boolean(payload.tomorrow),
      hasWeekly: payload.mode === "locked" ? payload.hasWeekly : Boolean(payload.weekly),
    });
  }

  return NextResponse.json({
    mode: "member",
    stock: {
      stockId: payload.stock.stockId,
      name: payload.stock.name,
      symbol: payload.stock.symbol,
      marketLabel: payload.stock.marketLabel,
      tags: payload.stock.tags,
      sourceLabel: payload.stock.sourceLabel,
    },
    today: payload.today,
    tomorrow: payload.tomorrow,
    weekly: payload.weekly,
    updatedAt: payload.updatedAt,
    riskLevel: payload.riskLevel,
    ipoHighVolWarning: payload.ipoHighVolWarning,
    sourceIds: payload.isAdmin ? payload.sourceIds : undefined,
  });
}
