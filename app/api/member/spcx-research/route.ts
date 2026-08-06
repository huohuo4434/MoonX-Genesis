import { NextRequest, NextResponse } from "next/server";
import { SPCX_MEMBER_RESEARCH } from "@/lib/data/spcx-member-20260806";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MEMBER_PROBES = [
  "/api/member/conviction-list/hype/forecast",
  "/api/member/conviction-list/eth/forecast",
  "/api/member/conviction-list/asteroid/forecast",
];

type DailyBar = { open: number; high: number; low: number; close: number };

function average(values: number[]): number | null {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

async function readTechnicalSnapshot() {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/SPCX?interval=1d&range=3mo&includePrePost=false";
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; MOOX/1.0)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              close?: Array<number | null>;
            }>;
          };
        }>;
      };
    };
    const result = json.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result?.timestamp?.length || !quote) return null;

    const bars: DailyBar[] = [];
    for (let i = 0; i < result.timestamp.length; i += 1) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      if (open == null || high == null || low == null || close == null) continue;
      if (![open, high, low, close].every(Number.isFinite)) continue;
      bars.push({ open, high, low, close });
    }
    if (bars.length < 8) return null;

    const recent = bars.slice(-20);
    const latest = recent.at(-1)!;
    const trueRanges = recent.slice(1).map((bar, index) => {
      const previousClose = recent[index]!.close;
      return Math.max(
        bar.high - bar.low,
        Math.abs(bar.high - previousClose),
        Math.abs(bar.low - previousClose)
      );
    });
    const atr14 = average(trueRanges.slice(-14));
    const swing = recent.slice(0, -1).slice(-10);
    const rawSupport = Math.min(...swing.map((bar) => bar.low));
    const rawResistance = Math.max(...swing.map((bar) => bar.high));
    const width = Math.max((atr14 ?? latest.close * 0.03) * 0.22, latest.close * 0.006);
    const round = (value: number) => Math.round(value * 100) / 100;

    return {
      asOf: new Date().toISOString(),
      source: "Yahoo Finance daily chart",
      currentClose: round(latest.close),
      atr14: atr14 == null ? null : round(atr14),
      supportZone: [round(rawSupport - width), round(rawSupport + width)],
      resistanceZone: [round(rawResistance - width), round(rawResistance + width)],
      confirmationZh: `至少1小时收盘重新站上 ${round(rawResistance + width)} 美元附近的近期结构上沿，并保持后续不快速跌回。`,
      confirmationEn: `At least a one-hour close back above the recent structure ceiling near $${round(rawResistance + width)}, followed by no rapid loss of that area.`,
      invalidationZh: `若日线收盘跌破 ${round(rawSupport - width)} 美元附近支撑下沿且成交继续扩张，推迟偏强窗口。`,
      invalidationEn: `If a daily close breaks below the support floor near $${round(rawSupport - width)} with expanding volume, delay the bullish window.`,
    };
  } catch {
    return null;
  }
}

async function hasMemberAccess(request: NextRequest): Promise<{
  allowed: boolean;
  unavailable: boolean;
}> {
  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  let sawProtectedResponse = false;

  for (const pathname of MEMBER_PROBES) {
    try {
      const response = await fetch(new URL(pathname, request.nextUrl.origin), {
        method: "GET",
        headers: {
          cookie,
          authorization,
          "user-agent": request.headers.get("user-agent") ?? "MOOX-SPCX-Probe",
        },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return { allowed: true, unavailable: false };
      if (response.status === 401 || response.status === 403 || response.status === 302 || response.status === 307) {
        sawProtectedResponse = true;
      }
    } catch {
      // Try the next existing member endpoint. Never expose content on probe failure.
    }
  }

  return { allowed: false, unavailable: !sawProtectedResponse };
}

export async function GET(request: NextRequest) {
  const access = await hasMemberAccess(request);
  if (!access.allowed) {
    return NextResponse.json(
      {
        error: access.unavailable ? "MEMBERSHIP_PROBE_UNAVAILABLE" : "MEMBER_REQUIRED",
      },
      { status: access.unavailable ? 503 : 403 }
    );
  }

  const technical = await readTechnicalSnapshot();
  return NextResponse.json(
    {
      research: SPCX_MEMBER_RESEARCH,
      technical,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie, Authorization",
      },
    }
  );
}
