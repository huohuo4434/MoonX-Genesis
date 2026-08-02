import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  deleteManualMarketPrice,
  listManualMarketPrices,
  MANUAL_PRICE_ASSETS,
  upsertManualMarketPrices,
} from "@/lib/market-data/manual-market-prices";
import {
  AUTOMATIC_SIGNAL_PRICE_SYMBOLS,
  getTradingSignalLivePrices,
} from "@/lib/market-data/trading-signal-live-prices";
import { runTradingSignalServerMonitor } from "@/lib/trading-signals/server-auto-monitor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const rowSchema = z.object({
  symbol: z.string().min(1).max(30),
  price: z.coerce.number().positive(),
  note: z.string().max(300).optional(),
  capturedAt: z.string().datetime().optional(),
});

const batchSchema = z.object({
  prices: z.array(rowSchema).min(1).max(50),
});

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const manual = await listManualMarketPrices();
  const test = request.nextUrl.searchParams.get("test") === "1";
  if (!test) {
    return NextResponse.json({ assets: MANUAL_PRICE_ASSETS, manual });
  }

  const result = await getTradingSignalLivePrices([...AUTOMATIC_SIGNAL_PRICE_SYMBOLS]);
  let sync: { monitoredSignals: number; pricedSignals: number; warnings: string[] } | null = null;
  try {
    const report = await runTradingSignalServerMonitor();
    sync = {
      monitoredSignals: report.monitoredSignals,
      pricedSignals: report.results.filter((row) => row.price != null).length,
      warnings: report.warnings,
    };
  } catch (error) {
    sync = {
      monitoredSignals: 0,
      pricedSignals: 0,
      warnings: [error instanceof Error ? error.message : "AI交易信号同步失败"],
    };
  }
  return NextResponse.json({
    assets: MANUAL_PRICE_ASSETS,
    manual,
    live: result.prices,
    warnings: [...result.warnings, ...(sync?.warnings ?? [])],
    sync,
    testedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const body = batchSchema.parse(await request.json());
    const manual = await upsertManualMarketPrices(body.prices);
    return NextResponse.json({ ok: true, manual });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues.map((issue) => issue.message).join("；")
            : error instanceof Error
              ? error.message
              : "保存失败",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ error: "缺少symbol" }, { status: 400 });
  await deleteManualMarketPrice(symbol);
  return NextResponse.json({ ok: true });
}
