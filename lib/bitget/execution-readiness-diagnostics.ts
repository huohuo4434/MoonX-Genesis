import "server-only";

import {
  getBitgetApiSecurity,
  getBitgetDemoAllPendingStrategyOrders,
  getBitgetDemoEnvironment,
  getBitgetDemoMarketQuotes,
  getBitgetDemoOpenOrders,
  getBitgetDemoCurrentPositions,
  getBitgetUtaSettingsSnapshot,
  previewBitgetUtaLeverage,
  syncBitgetServerClock,
  testBitgetDemoConnection,
} from "@/lib/bitget/demo-client";
import { auditBitgetLiveResumeReadiness } from "@/lib/bitget/live-resume-readiness";
import { isUtaHedgeMode, planUtaLeverageConfiguration } from "@/lib/bitget/live-execution-core";

export type ExecutionDiagnosticCheck = {
  key: string;
  ok: boolean;
  label: string;
  detail: string;
};

export type ExecutionReadinessDiagnostics = {
  generatedAt: string;
  mode: string;
  overall: "PASS" | "BLOCKED";
  checks: ExecutionDiagnosticCheck[];
  plannedLeverageRequests: Array<{ side: "long" | "short"; required: boolean; body: Record<string, string>; reason: string }>;
  notes: string[];
};

export async function runExecutionReadinessDiagnostics(): Promise<ExecutionReadinessDiagnostics> {
  const env = getBitgetDemoEnvironment();
  const checks: ExecutionDiagnosticCheck[] = [];
  const notes: string[] = [];

  const [clock, connection, security, settings, positions, openOrders, strategyOrders, readiness] = await Promise.all([
    syncBitgetServerClock(true).catch((error) => ({ safe: false, offsetMs: NaN, syncedAt: null, error: error instanceof Error ? error.message : String(error) })),
    testBitgetDemoConnection().catch((error) => ({ error: error instanceof Error ? error.message : String(error) })),
    getBitgetApiSecurity().catch((error) => ({ error: error instanceof Error ? error.message : String(error) })),
    getBitgetUtaSettingsSnapshot().catch((error) => ({ error: error instanceof Error ? error.message : String(error) })),
    getBitgetDemoCurrentPositions().catch(() => []),
    getBitgetDemoOpenOrders().catch(() => []),
    getBitgetDemoAllPendingStrategyOrders().catch(() => []),
    auditBitgetLiveResumeReadiness().catch(() => null),
  ]);

  const connectionError = "error" in connection ? connection.error : null;
  const holdMode = "error" in settings ? "unknown" : String(settings.holdMode ?? "unknown");
  const accountMode = "error" in settings ? "unknown" : String(settings.accountMode ?? "unknown");
  const clockSafe = "safe" in clock && Boolean(clock.safe);
  const permissionsOk = "error" in security ? false : security.failClosedReady;
  const permissionsDetail = "error" in security ? security.error : security.message;

  checks.push({ key: "configured", ok: env.configured, label: "Bitget环境变量", detail: env.configured ? "已配置" : "缺失" });
  checks.push({ key: "connection", ok: !("error" in connection), label: "UTA账户只读连接", detail: connectionError ?? `正常 · ${accountMode} · ${holdMode}` });
  checks.push({ key: "clock", ok: clockSafe, label: "服务器时间", detail: clockSafe ? `安全 · 偏差 ${Math.round(Number("offsetMs" in clock ? clock.offsetMs : 0))}ms` : ("error" in clock ? String(clock.error ?? "不安全") : "不安全") });
  checks.push({ key: "permissions", ok: permissionsOk, label: "API权限", detail: permissionsDetail });
  checks.push({ key: "positions", ok: positions.length === 0, label: "当前持仓", detail: `${positions.length} 个` });
  checks.push({ key: "openOrders", ok: openOrders.length === 0, label: "普通挂单", detail: `${openOrders.length} 个` });
  checks.push({ key: "strategyOrders", ok: strategyOrders.length === 0, label: "策略单", detail: `${strategyOrders.length} 个` });
  checks.push({ key: "legacy", ok: Boolean(readiness && readiness.legacyUnresolvedCount === 0 && readiness.executionFailureAudit.safe), label: "历史订单审计", detail: readiness ? `未核对 ${readiness.legacyUnresolvedCount} · 已归档 ${readiness.legacyReconciledCount} · ${readiness.executionFailureAudit.summary}` : "未取得恢复审计快照" });
  checks.push({ key: "heartbeat", ok: Boolean(readiness && readiness.heartbeatAgeSeconds != null && readiness.heartbeatAgeSeconds <= 180), label: "服务器心跳", detail: readiness ? `${readiness.heartbeatAgeSeconds ?? "—"}秒` : "未取得" });
  checks.push({ key: "quoteFresh", ok: Boolean(readiness && readiness.quoteAgeSeconds != null && readiness.quoteAgeSeconds <= 180 && readiness.freshQuotesCount >= readiness.totalSymbols), label: "行情新鲜度", detail: readiness ? `${readiness.freshQuotesCount}/${readiness.totalSymbols} · ${readiness.quoteAgeSeconds ?? "—"}秒` : "未取得" });

  const sampleSymbol = env.liveAllowedSymbols[0] ?? "ETHUSDT";
  const plannedLeverageRequests: ExecutionReadinessDiagnostics["plannedLeverageRequests"] = [];
  if (!("error" in settings)) {
    for (const side of ["long", "short"] as const) {
      const plan = planUtaLeverageConfiguration({ settings, symbol: sampleSymbol, leverage: env.leverage, marginMode: "isolated", posSide: side, category: "USDT-FUTURES" });
      plannedLeverageRequests.push({ side, ...plan });
    }
    const hedge = isUtaHedgeMode(holdMode);
    const shapeOk = plannedLeverageRequests.every((row) => !hedge || (row.body.posSide && row.body.longLeverage && row.body.shortLeverage));
    checks.push({ key: "payloadShape", ok: Boolean(shapeOk), label: "杠杆请求形态", detail: hedge ? (shapeOk ? "双向持仓：posSide + longLeverage + shortLeverage 已齐全" : "双向持仓参数不完整") : "单向持仓参数形态正常" });
  } else {
    checks.push({ key: "payloadShape", ok: false, label: "杠杆请求形态", detail: "账户设置读取失败，无法生成安全预览" });
  }

  try {
    const leveragePreview = await previewBitgetUtaLeverage({ symbol: sampleSymbol, leverage: env.leverage });
    checks.push({ key: "leveragePreview", ok: true, label: "Bitget官方杠杆预检查", detail: `只读pre-set-leverage通过 · ${sampleSymbol} · ${JSON.stringify(leveragePreview).slice(0, 180)}` });
  } catch (error) {
    checks.push({ key: "leveragePreview", ok: false, label: "Bitget官方杠杆预检查（只读告警）", detail: `V7.17.9: leverage preview is advisory，不阻断真实执行；${error instanceof Error ? error.message : "预检查失败"}` });
  }

  try {
    const quotes = await getBitgetDemoMarketQuotes(env.liveAllowedSymbols);
    const quoteSymbols = new Set(quotes.map((row) => row.symbol));
    const missing = env.liveAllowedSymbols.filter((symbol) => !quoteSymbols.has(symbol));
    checks.push({ key: "quotes", ok: missing.length === 0, label: "允许池行情", detail: missing.length ? `缺少 ${missing.join(", ")}` : `${quotes.length}/${env.liveAllowedSymbols.length} 全部可读` });
  } catch (error) {
    checks.push({ key: "quotes", ok: false, label: "允许池行情", detail: error instanceof Error ? error.message : "读取失败" });
  }

  notes.push("这份自检只读取账户/行情并生成请求预览，不调用set-leverage、place-order、cancel-order或Resume。 ");
  notes.push("真正自动开仓仍需通过AUTO_ORDER恢复闸门、策略方向、技术触发和风险预算。 ");
  notes.push("设置杠杆后，V7.17.0会重新读取account/settings并验证2倍是否真的生效；验证失败则在下单前停止。 ");

  const advisoryKeys = new Set(["leveragePreview"]); // V7.17.9: read-only preview incompatibility is visible but non-blocking.
  const overall = checks.filter((row) => !advisoryKeys.has(row.key)).every((row) => row.ok) ? "PASS" : "BLOCKED";
  return { generatedAt: new Date().toISOString(), mode: env.mode, overall, checks, plannedLeverageRequests, notes };
}
