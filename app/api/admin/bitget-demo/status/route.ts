import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getBitgetDemoEnvironment } from "@/lib/bitget/demo-client";
import {
  getBitgetDemoAdminDashboard,
  getBitgetLiveAdminDashboard,
} from "@/lib/bitget/demo-runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`状态读取超过${Math.round(timeoutMs / 1000)}秒`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const environment = getBitgetDemoEnvironment();
    const dashboard = environment.mode === "LIVE_EXPERIMENT"
      ? await withTimeout(getBitgetLiveAdminDashboard(), 8_000)
      : await withTimeout(getBitgetDemoAdminDashboard(), 12_000);

    return NextResponse.json(dashboard, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取失败" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
