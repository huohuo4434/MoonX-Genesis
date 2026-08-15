import { NextResponse } from "next/server";
import { getMemberUserContext } from "@/lib/access/member-preview";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import { getMemberStockDetailPayload } from "@/lib/data/member-stocks/access";
import { projectAttributionForAudience } from "@/lib/presentation/public-attribution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const requireMemberDeviceAccess=getMemberDevicePageAccess;

type ResponseAudience = "MEMBER" | "PUBLIC" | "ADMIN";
type ResponseLocale = "zh" | "en";

function jsonNoStore(
  body: unknown,
  init?: ResponseInit,
  presentation: { audience?: ResponseAudience; locale?: ResponseLocale } = {},
) {
  const response = NextResponse.json(projectAttributionForAudience(body, {
    audience: presentation.audience ?? "MEMBER",
    locale: presentation.locale ?? "zh",
  }), init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

/**
 * Member stock detail API — strips analysis fields for non-members.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  const locale: ResponseLocale = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "zh";
  const { symbol } = await context.params;
  const [user, gate] = await Promise.all([
    getMemberUserContext(),
    requireMemberDeviceAccess(),
  ]);
  const payload = await getMemberStockDetailPayload(symbol);

  if (!payload) {
    return jsonNoStore({ error: "not found" }, { status: 404 }, { locale });
  }

  if (payload.mode === "locked" || !user.isMember || gate.status !== "ALLOWED") {
    return jsonNoStore({
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
    }, undefined, { locale });
  }

  const rate = await checkMemberApiRateLimit({ scope: "member-stock" });
  if (!rate.ok) return jsonNoStore({ error: "请求过于频繁" }, { status: 429 }, { locale });

  return jsonNoStore({
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
  }, undefined, { audience: payload.isAdmin ? "ADMIN" : "MEMBER", locale });
}
