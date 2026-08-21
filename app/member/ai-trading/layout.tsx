// MOOX_V72063_AI_ROUTE_OVERLAY
import type { ReactNode } from "react";
import Link from "next/link";
import { AdminPublicTradingPerformance } from "@/components/member/AdminPublicTradingPerformance";
import { getAdminTradingPerformanceSnapshot } from "@/lib/trading-signals/admin-public-performance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiTradingResearchLayout({ children }: { children: ReactNode }) {
  const snapshot = await getAdminTradingPerformanceSnapshot().catch(() => ({
    available: false,
    environmentLabel: "管理员账户",
    equityUsdt: null,
    availableUsdt: null,
    currentPositions: [],
    closedTrades: [],
    recentNetProfitUsdt: 0,
    profitableTrades: 0,
    losingTrades: 0,
    generatedAt: new Date().toISOString(),
    errorZh: "交易所只读数据暂时不可用。",
  }));

  return (
    <>
      {children}
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">会员只读监控</p>
          <h2 className="mt-2 text-xl font-semibold text-white">一键监控研究计划</h2>
          <p className="mt-2 text-sm leading-7 text-white/55">
            下载后先填写只读计划Token并运行PAPER。只有会员自己选择进入DRY_RUN/LIVE时，本地Agent才会连接Bitget；三项交易所密钥始终只留在会员本机。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link prefetch={false} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black"
               href="/api/v1/member/trading/artifacts/windows">
              下载会员接入包
            </Link>
            <Link prefetch={false} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80"
               href="/api/v1/member/trading/artifacts/pdf">
              下载详细教程
            </Link>
          </div>
        </div>
        <AdminPublicTradingPerformance snapshot={snapshot} />
      </div>
    </>
  );
}
