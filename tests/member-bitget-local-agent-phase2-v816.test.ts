import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
// The downloadable artifact is intentionally plain ESM with no package dependency.
// @ts-expect-error JavaScript download artifact has no declaration file.
import { assertAccountSettings, assertContract, assertLiveOptIn, assertPermissionSafety, bitgetSignature, clockOffset, confirmedOrderIdentity, executionGeometryValid, executionQuote, findExistingLiveRecord, normalizedPrice, normalizedQuantity, positionList, preflightDisposition, recoveryMarketPrice, strategyProtectionMatches, updateRiskLedger, validatePlan, validateRecoveryPlan } from "../private-assets/member-trading/moox-bitget-local-agent.mjs";

const now = Date.parse("2026-08-15T12:00:00.000Z");
const plan = {
  schema: "moonx.member.trading-plan.v1", planId: "plan-1", version: 1, revisionId: "abcdefabcdefabcdefabcdef",
  symbol: "BTCUSDT", generatedAt: "2026-08-15T11:59:30.000Z", state: "LONG_READY",
  instrument: { assetId: "btc", canonicalSymbol: "BTCUSDT", bitgetSymbol: "BTCUSDT", availability: "AVAILABLE", executionScope: "PAPER_LOCAL" },
  authority: { valid: true, forecastId: "f1", forecastVersion: "v1", publishedAt: "2026-08-10T00:00:00.000Z", lockedAt: "2026-08-10T00:00:00.000Z", validUntil: "2026-08-17T00:00:00.000Z", direction: "LONG" },
  evidence: { formalPublishedPlanOnly: true, researchOnlyExcluded: true, sourcePlanContentHash: "content-hash-locked" },
  risk: { memberLocalAgentEligible: true, serverExecutionAllowed: false, tradingEligible: true },
  methodology: { selected: "LIUYAO_CHAN", label: "4. 六爻＋缠论", trial: true, liuyaoAvailable: true, qimenAvailable: false, chanAvailable: true, eligible: true, reason: "证据齐全" },
  chan: { timeframes: ["30m", "1H", "4H", "1D"].map((timeframe) => ({ timeframe, available: true, complete: true })) },
  execution: { levelStatus: "VALID", currentPrice: 67000, entryZone: [66800, 67200], stopLoss: 66000, takeProfits: [68000, 69000, 70000] },
};

test("download agent signs the exact UTA prehash and rejects stale or incomplete plans", () => {
  const input = { timestamp: "16273667805456", method: "GET", requestPath: "/api/v3/account/fee-rate", query: "category=SPOT&symbol=BTCUSDT", body: "", secret: "secret" };
  const expected = createHmac("sha256", input.secret).update(`${input.timestamp}GET${input.requestPath}?${input.query}`).digest("base64");
  assert.equal(bitgetSignature(input), expected);
  assert.equal(validatePlan(plan, now), plan);
  assert.throws(() => validatePlan({ ...plan, generatedAt: "2026-08-15T11:55:00.000Z" }, now), /超过120秒/);
  assert.throws(() => validatePlan({ ...plan, risk: { ...plan.risk, memberLocalAgentEligible: false } }, now), /未授权/);
  assert.throws(() => validatePlan({ ...plan, evidence: { ...plan.evidence, sourcePlanContentHash: "" } }, now), /内容身份/);
  assert.throws(() => validatePlan(plan, now, "ETHUSDT"), /品种/);
});

test("all execution layers reject reversed or invaded entry-zone geometry", () => {
  assert.equal(executionGeometryValid(plan), true);
  assert.equal(executionGeometryValid({ ...plan, execution: { ...plan.execution, entryZone: [67200, 66800] } }), false);
  assert.equal(executionGeometryValid({ ...plan, execution: { ...plan.execution, stopLoss: 66900 } }), false);
  assert.equal(executionGeometryValid({ ...plan, execution: { ...plan.execution, currentPrice: 69000, takeProfits: [68000, 70000, 71000] } }), false);
  assert.equal(executionGeometryValid({ ...plan, execution: { ...plan.execution, takeProfits: [68000, 68000, 70000] } }), false);
  const short = { ...plan, state: "SHORT_READY", authority: { ...plan.authority, direction: "SHORT" }, execution: { ...plan.execution, currentPrice: 67000, entryZone: [66800, 67200], stopLoss: 68000, takeProfits: [66000, 65000, 64000] } };
  assert.equal(executionGeometryValid(short), true);
  assert.equal(executionGeometryValid({ ...short, execution: { ...short.execution, stopLoss: 67100 } }), false);
});

test("existing LIVE record is discoverable before new-open availability gates", () => {
  const record = { mode: "LIVE", planId: "plan-1", version: 1, symbol: "BTCUSDT", posSide: "long", clientOid: "mxe_1" };
  const unavailable = { ...plan, state: "INSTRUMENT_UNAVAILABLE", instrument: { ...plan.instrument, availability: "UNAVAILABLE", executionScope: "RESEARCH_ONLY", bitgetSymbol: null }, risk: { ...plan.risk, tradingEligible: false, memberLocalAgentEligible: false } };
  assert.equal(findExistingLiveRecord({ executions: { old: record } }, unavailable, "BTCUSDT"), record);
  assert.equal(validateRecoveryPlan(unavailable, record, "BTCUSDT"), unavailable);
  assert.throws(() => validateRecoveryPlan(unavailable, { ...record, posSide: "short" }, "BTCUSDT"), /持仓方向/);
  assert.equal(findExistingLiveRecord({ executions: {} }, unavailable, "BTCUSDT"), null);
  assert.throws(() => validatePlan(unavailable, now, "BTCUSDT"), /精确合约|未授权/);
});

test("existing LIVE protection recovery uses a fresh exact Bitget mark without entry permission", () => {
  assert.equal(recoveryMarketPrice("BTCUSDT", { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67100", ts: String(now - 1000) }, now), 67100);
  assert.throws(() => recoveryMarketPrice("BTCUSDT", { category: "USDT-FUTURES", symbol: "ETHUSDT", markPrice: "67100", ts: String(now - 1000) }, now), /品种/);
  assert.throws(() => recoveryMarketPrice("BTCUSDT", { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67100", ts: String(now - 6000) }, now), /超过5秒/);
  const source = readFileSync("private-assets/member-trading/moox-bitget-local-agent.mjs", "utf8");
  assert.ok(source.indexOf("findExistingLiveRecord(state, payload, symbol)") < source.indexOf("const plan = validatePlan(payload"));
  assert.match(source, /recoveryMarketPrice\(symbol, await marketTicker\(symbol\)\)/);
});

test("persistent local risk ledger requires DRY baseline and survives restart/day rollover", () => {
  const liveState: { executions: Record<string, unknown>; riskLedger?: Record<string, unknown> } = { executions: {} };
  assert.throws(() => updateRiskLedger(liveState, 10000, "LIVE", new Date("2026-08-15T00:00:00Z")), /DRY_RUN/);
  const state: { executions: Record<string, unknown>; riskLedger?: Record<string, unknown> } = { executions: {} };
  updateRiskLedger(state, 10000, "DRY_RUN", new Date("2026-08-15T00:00:00Z"));
  assert.equal(state.riskLedger?.dayStartEquity, 10000);
  assert.throws(() => updateRiskLedger(state, 9799, "LIVE", new Date("2026-08-15T12:00:00Z")), /当日亏损/);
  const restarted = JSON.parse(JSON.stringify(state));
  updateRiskLedger(restarted, 9900, "LIVE", new Date("2026-08-16T00:00:00Z"));
  assert.equal(restarted.riskLedger.dayStartEquity, 9900);
  assert.throws(() => updateRiskLedger({ executions: {}, riskLedger: { day: "2026-08-15", dayStartEquity: 0, highWaterEquity: 1, currentEquity: 1 } }, 1, "LIVE"), /账本损坏/);
});

test("official UTA response shapes, quantity multipliers, minimums and clock are fail closed", () => {
  assert.deepEqual(positionList({ data: { list: [{ symbol: "BTCUSDT", total: "0.1" }] } }), [{ symbol: "BTCUSDT", total: "0.1" }]);
  assert.deepEqual(positionList({ data: [] }), []);
  assert.equal(normalizedQuantity(0.137, { quantityMultiplier: "0.02", quantityPrecision: "2", minOrderQty: "0.02", minOrderAmount: "5" }, 100), "0.12");
  assert.throws(() => normalizedQuantity(0.03, { quantityMultiplier: "0.02", quantityPrecision: "2", minOrderQty: "0.02", minOrderAmount: "5" }, 100), /最小下单金额/);
  assert.equal(clockOffset(1000, 1100, { data: { serverTime: "1075" } }), 25);
});

test("permissions, account configuration and LIVE consent are explicit", () => {
  assert.equal(assertPermissionSafety({ permissions: ["uta_trade", "uta_mgt"], permType: "read-and-write", ips: "203.0.113.1" }, "LIVE"), true);
  assert.throws(() => assertPermissionSafety({ permissions: ["uta_trade", "uta_mgt", "withdraw"] }, "DRY_RUN"), /禁止权限/);
  assert.throws(() => assertPermissionSafety({ permissions: ["uta_trade"] }, "DRY_RUN"), /uta_mgt/);
  assert.equal(assertAccountSettings({ accountMode: "unified", holdMode: "hedge_mode", symbolConfigList: [{ category: "USDT-FUTURES", symbol: "BTCUSDT", marginMode: "isolated", leverage: "2" }] }, "BTCUSDT", 2), true);
  assert.throws(() => assertAccountSettings({ accountMode: "unified", holdMode: "hedge_mode", symbolConfigList: [{ category: "USDT-FUTURES", symbol: "ETHUSDT", marginMode: "isolated", leverage: "2" }] }, "BTCUSDT", 2), /BTCUSDT/);
  assert.throws(() => assertAccountSettings({ accountMode: "unified", holdMode: "one_way_mode", symbolConfigList: [] }, "BTCUSDT", 2), /hedge_mode/);
  assert.throws(() => assertLiveOptIn("LIVE", {}), /LIVE未启用/);
  assert.doesNotThrow(() => assertLiveOptIn("LIVE", { MOOX_ENABLE_LIVE: "true", MOOX_LIVE_CONFIRMATION: "I_ACCEPT_LOCAL_LIVE_RISK" }));
});

test("contract prices, order identity and secondary protection are bound exactly", () => {
  const contract = { symbol: "BTCUSDT", category: "USDT-FUTURES", status: "online", priceMultiplier: "0.5", pricePrecision: "1", maxMarketOrderQty: "2" };
  assert.equal(normalizedPrice(66000.24, contract), "66000.0");
  assert.equal(assertContract(contract, "0.1"), true);
  assert.throws(() => assertContract({ ...contract, status: "limit_open" }, "0.1"), /不可交易/);
  const identity = { clientOid: "mxe_1", symbol: "BTCUSDT", posSide: "long", orderStatus: "filled", cumExecQty: "0.1" };
  assert.equal(confirmedOrderIdentity(identity, { clientOid: "mxe_1", symbol: "BTCUSDT", posSide: "long" }), true);
  assert.equal(confirmedOrderIdentity({ ...identity, posSide: "short" }, { clientOid: "mxe_1", symbol: "BTCUSDT", posSide: "long" }), false);
  const strategy = { clientOid: "mxp_1", symbol: "BTCUSDT", posSide: "long", status: "pending", tpTriggerBy: "mark", slTriggerBy: "mark", takeProfit: "68000.0", stopLoss: "66000.0" };
  assert.equal(strategyProtectionMatches(strategy, { clientOid: "mxp_1", symbol: "BTCUSDT", posSide: "long", takeProfit: "68000.0", stopLoss: "66000.0" }), true);
  assert.equal(strategyProtectionMatches({ ...strategy, stopLoss: "65999.5" }, { clientOid: "mxp_1", symbol: "BTCUSDT", posSide: "long", takeProfit: "68000.0", stopLoss: "66000.0" }), false);
});

test("fresh Bitget quote must match the locked entry or confirmation gate", () => {
  const quotePlan = { ...plan, execution: { ...plan.execution, currentPrice: 67200, entryZone: [66900, 67400], confirmationAboveOrBelow: 67500 } };
  assert.equal(executionQuote(quotePlan, { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67200", ts: String(now - 1000) }, now), 67200);
  assert.equal(executionQuote(quotePlan, { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67500", ts: String(now - 1000) }, now), 67500);
  assert.throws(() => executionQuote(quotePlan, { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67450", ts: String(now - 1000) }, now), /入场区/);
  assert.throws(() => executionQuote(quotePlan, { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "67200", ts: String(now - 6000) }, now), /超过5秒/);
  assert.throws(() => executionQuote(quotePlan, { category: "USDT-FUTURES", symbol: "BTCUSDT", markPrice: "68000", ts: String(now - 1000) }, now), /偏离/);
});

test("crash recovery disposition precedes kill and unrelated-position rejection", () => {
  const expected = { clientOid: "mxe_1", symbol: "BTCUSDT", posSide: "long" };
  const prior = { code: "00000", data: { ...expected, orderStatus: "filled", cumExecQty: "0.1" } };
  assert.equal(preflightDisposition(prior, expected), "RECOVER");
  assert.equal(preflightDisposition({ code: "25204", msg: "Order does not exist" }, expected), "ABSENT");
  assert.throws(() => preflightDisposition({ code: "25001", msg: "timeout" }, expected), /查单失败/);
  assert.throws(() => preflightDisposition({ code: "00000", data: { ...prior.data, posSide: "short" } }, expected), /身份/);
});

test("agent defaults to PAPER and preserves reconciliation, preset protection and kill-switch boundaries", () => {
  const source = readFileSync("private-assets/member-trading/moox-bitget-local-agent.mjs", "utf8");
  assert.match(source, /MOOX_AGENT_MODE \|\| "PAPER"/);
  assert.match(source, /\/api\/v2\/public\/time/);
  assert.match(source, /response\?\.data\?\.list/);
  assert.match(source, /quantityMultiplier/);
  assert.match(source, /minOrderAmount/);
  assert.match(source, /\/api\/v3\/account\/settings/);
  assert.match(source, /currentPositions\(\)/);
  assert.match(source, /已有USDT合约持仓/);
  assert.match(source, /GET", "\/api\/v3\/trade\/order-info"/);
  assert.match(source, /String\(response\?\.code\) === "25204"/);
  assert.ok(source.indexOf("GET\", \"/api/v3/trade/order-info") < source.indexOf("POST\", \"/api/v3/trade/place-order"));
  for (const field of ["takeProfit", "stopLoss", "tpTriggerBy", "slTriggerBy", "clientOid"]) assert.ok(source.includes(field), field);
  const protection = source.slice(source.indexOf("async function placeProtection"), source.indexOf("async function paper"));
  assert.doesNotMatch(protection, /assertKillSwitch/);
  assert.doesNotMatch(source, /\/api\/v\d+\/.*(?:withdraw|transfer)/i);
});

test("member UI exposes plans, methodology, read-only token lifecycle and local-only downloads", () => {
  const ui = readFileSync("components/member/MemberTradingOnboarding.tsx", "utf8");
  const page = readFileSync("app/member/ai-trading/page.tsx", "utf8");
  for (const value of ["/api/v1/member/trading/plans/current", "/api/v1/member/trading/api-keys", "/api/v1/member/trading/artifacts/", "method: \"DELETE\"", "MEMBER_METHODOLOGIES", "MOOX_METHOD="]) assert.ok(ui.includes(value), value);
  assert.match(ui, /本站没有也不会提供上传这些交易所密钥的输入框/);
  assert.doesNotMatch(ui, /name=["'](?:apiKey|secret|passphrase)/i);
  assert.match(page, /MemberTradingOnboarding/);
  assert.doesNotMatch(page, /AiTradingDeskClient|createMemberAiTradingDeskPlaceholder/);
  const artifactRoute = readFileSync("app/api/v1/member/trading/artifacts/[artifact]/route.ts", "utf8");
  assert.match(artifactRoute, /getMemberDevicePageAccess/);
  assert.match(artifactRoute, /checkMemberApiRateLimit/);
  assert.match(artifactRoute, /private-assets.*member-trading/s);
  assert.match(artifactRoute, /Content-Range/);
  for (const path of ["public/downloads/MOOX-Bitget-Windows.zip", "public/downloads/moox-bitget-local-agent.mjs", "public/tutorials/MOOX会员Bitget接入教程.mp4"]) assert.equal(existsSync(path), false, path);
  assert.ok(statSync("private-assets/member-trading/MOOX会员Bitget接入教程.mp4").size < 4_000_000, "video must remain below the authenticated function response budget");
});
