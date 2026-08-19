// MOOX_V7206_ADMIN_PERFORMANCE_READONLY
import "server-only";

import {
  getBitgetDemoEnvironment,
  getBitgetRuntimeAccountBalance,
  getBitgetDemoCurrentPositions,
  getBitgetDemoClosedPositions,
  type BitgetDemoPosition,
  type BitgetDemoClosedPosition,
} from "@/lib/bitget/demo-client";

export type AdminTradingPerformanceSnapshot = {
  available: boolean;
  environmentLabel: string;
  equityUsdt: number | null;
  availableUsdt: number | null;
  currentPositions: BitgetDemoPosition[];
  closedTrades: BitgetDemoClosedPosition[];
  recentNetProfitUsdt: number;
  profitableTrades: number;
  losingTrades: number;
  generatedAt: string;
  errorZh: string | null;
};

export async function getAdminTradingPerformanceSnapshot(now = new Date()): Promise<AdminTradingPerformanceSnapshot> {
  const env = getBitgetDemoEnvironment();
  const [balanceResult, positionsResult, closedResult] = await Promise.allSettled([
    getBitgetRuntimeAccountBalance(),
    getBitgetDemoCurrentPositions(),
    getBitgetDemoClosedPositions(100),
  ]);
  const balance = balanceResult.status === "fulfilled" ? balanceResult.value : null;
  const currentPositions = positionsResult.status === "fulfilled" ? positionsResult.value : [];
  const closedTrades = closedResult.status === "fulfilled" ? closedResult.value : [];
  const recentNetProfitUsdt = closedTrades.reduce((sum, trade) => sum + (Number.isFinite(trade.netProfit) ? trade.netProfit : 0), 0);
  const failed = [balanceResult, positionsResult, closedResult].filter((result) => result.status === "rejected").length;
  return {
    available: Boolean(balance || currentPositions.length || closedTrades.length),
    environmentLabel: env.mode === "LIVE_EXPERIMENT" ? "管理员实盘账户" : "管理员演示账户",
    equityUsdt: balance?.equityUsdt ?? null,
    availableUsdt: balance?.availableUsdt ?? null,
    currentPositions,
    closedTrades,
    recentNetProfitUsdt,
    profitableTrades: closedTrades.filter((trade) => trade.netProfit > 0).length,
    losingTrades: closedTrades.filter((trade) => trade.netProfit < 0).length,
    generatedAt: now.toISOString(),
    errorZh: failed ? `有${failed}项交易所只读数据暂未取到，页面不会用旧值补齐。` : null,
  };
}
