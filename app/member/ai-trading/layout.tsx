// MOOX_V72063_AI_ROUTE_OVERLAY
import type { ReactNode } from "react";
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
            下载后按说明填写只读Token并双击启动。该工具不连接交易所账户，不下单、不撤单。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black"
               href="/downloads/MOOX会员只读监控-一键部署.zip">
              下载一键监控包
            </a>
            <a className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80"
               href="/downloads/MOOX会员只读监控详细说明.md">
              查看详细说明
            </a>
          </div>
        </div>
        <AdminPublicTradingPerformance snapshot={snapshot} />
      </div>
    </>
  );
}
