import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

const common = {
  symbol: z.string().min(1).max(20).regex(/^[A-Za-z0-9.\-]+$/),
  idempotencyKey: z.string().min(8).max(120).regex(/^[A-Za-z0-9:_\-.]+$/),
};
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ENTER"), ...common,
    expectedPlanId: z.string().min(1).max(160),
    expectedPlanVersion: z.number().int().positive(),
    expectedRevisionId: z.string().length(24).regex(/^[a-f0-9]+$/),
  }),
  z.object({
    action: z.literal("EXIT"), ...common,
    positionId: z.string().min(1).max(160),
  }),
]);

// Authorization is enforced before any plan or Paper ledger module is loaded.
async function authorize() {
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED" || !gate.access.userId) {
    return { gate, userId: null as string | null };
  }
  return { gate, userId: gate.access.userId };
}

function denied(status: string) {
  return NextResponse.json(
    { error: status === "LOGIN_REQUIRED" ? "请先登录" : status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足" },
    { status: status === "LOGIN_REQUIRED" ? 401 : 403 }
  );
}

export async function GET() {
  const auth = await authorize();
  if (!auth.userId) return denied(auth.gate.status);
  const rate = await checkMemberApiRateLimit({ scope: "member-paper-read", limit: 60 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const paper = await import("@/lib/trading-signals/member-paper-store");
  const initial = await paper.getMemberPaperSnapshot(auth.userId);
  const symbols = [...new Set(initial.positions.filter((position) => position.status === "OPEN").map((position) => position.symbol))].slice(0, 4);
  let snapshot = initial;
  if (symbols.length) {
    const { loadFreshMemberMarketPrice } = await import("@/lib/trading-signals/member-trading-plan.server");
    const quotes = await Promise.all(symbols.map(async (symbol) => ({ symbol, price: await loadFreshMemberMarketPrice({ symbol }) })));
    const prices = Object.fromEntries(quotes.flatMap((quote) =>
      quote.price != null ? [[quote.symbol.toUpperCase(), quote.price] as const] : []
    ));
    snapshot = await paper.markMemberPaperPositions({ userId: auth.userId, prices });
  }
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "private, no-store", "X-MOOX-Execution-Scope": "paper-only" },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if (!auth.userId) return denied(auth.gate.status);
  const rate = await checkMemberApiRateLimit({ scope: "member-paper-write", limit: 20 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  try {
    const body = bodySchema.parse(await request.json());
    const paper = await import("@/lib/trading-signals/member-paper-store");
    const fingerprint = body.action === "ENTER"
      ? paper.buildMemberPaperRequestFingerprint({
          action: "ENTER", symbol: body.symbol, planId: body.expectedPlanId,
          planVersion: body.expectedPlanVersion, revisionId: body.expectedRevisionId,
        })
      : paper.buildMemberPaperRequestFingerprint({ action: "EXIT", symbol: body.symbol, positionId: body.positionId });
    const prior = await paper.getMemberPaperIdempotentResult({ userId: auth.userId, idempotencyKey: body.idempotencyKey, fingerprint });
    if (prior) return NextResponse.json(prior, { headers: { "Cache-Control": "private, no-store", "X-MOOX-Execution-Scope": "paper-only" } });
    const planModule = await import("@/lib/trading-signals/member-trading-plan.server");
    let snapshot;
    if (body.action === "ENTER") {
      const plan = await planModule.loadCurrentMemberTradingPlan({ symbol: body.symbol });
      if (!plan) return NextResponse.json({ error: "该品种暂无已发布交易计划" }, { status: 404 });
      if (plan.planId !== body.expectedPlanId || plan.version !== body.expectedPlanVersion || plan.revisionId !== body.expectedRevisionId) {
        return NextResponse.json({ error: "计划版本已经变化，请重新读取后确认" }, { status: 409 });
      }
      snapshot = await paper.enterMemberPaperPlan({ userId: auth.userId, idempotencyKey: body.idempotencyKey, plan });
    } else {
      const price = await planModule.loadFreshMemberMarketPrice({ symbol: body.symbol });
      if (price == null) return NextResponse.json({ error: "该品种缺少新鲜行情，暂不能结算Paper持仓" }, { status: 409 });
      snapshot = await paper.exitMemberPaperPosition({
        userId: auth.userId, idempotencyKey: body.idempotencyKey,
        symbol: body.symbol, positionId: body.positionId, price,
      });
    }
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store", "X-MOOX-Execution-Scope": "paper-only" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paper操作失败" }, { status: 400 });
  }
}
