#!/usr/bin/env node
/**
 * MOOX Bitget UTA local execution agent v1.
 * Secrets are read only from this machine's environment and are never sent to MOOX.
 * Node.js 20+; no third-party packages.
 */
import { createHash, createHmac, randomUUID } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const VERSION = "1.0.0";
export const LIVE_CONFIRMATION = "I_ACCEPT_LOCAL_LIVE_RISK";
export const CATEGORY = "USDT-FUTURES";
const BITGET_BASE = "https://api.bitget.com";
const STATE_FILE = process.env.MOOX_AGENT_STATE_FILE || ".moox-agent-state.json";
const KILL_FILE = process.env.MOOX_AGENT_KILL_SWITCH || "MOOX_AGENT_STOP";
const FORBIDDEN_PERMISSIONS = ["withdraw", "transfer"];
let bitgetClockOffsetMs = 0;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少本地环境变量 ${name}`);
  return value;
}

function mode() {
  const value = (process.env.MOOX_AGENT_MODE || "PAPER").trim().toUpperCase();
  if (!["PAPER", "DRY_RUN", "LIVE"].includes(value)) throw new Error("MOOX_AGENT_MODE只能是 PAPER、DRY_RUN 或 LIVE");
  return value;
}

function numberEnv(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name}必须在${min}至${max}之间`);
  return value;
}

function assertKillSwitch() {
  if (existsSync(KILL_FILE)) throw new Error(`本地急停已生效：检测到 ${KILL_FILE}`);
}

export function bitgetSignature({ timestamp, method, requestPath, query = "", body = "", secret }) {
  const suffix = query ? `?${query}` : "";
  const prehash = `${timestamp}${method.toUpperCase()}${requestPath}${suffix}${body}`;
  return createHmac("sha256", secret).update(prehash).digest("base64");
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") query.set(key, String(value));
  return query.toString();
}

async function jsonRequest(url, init = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${payload?.msg || payload?.error || "请求失败"}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function localCredentials() {
  return {
    apiKey: required("BITGET_API_KEY"),
    secret: required("BITGET_API_SECRET"),
    passphrase: required("BITGET_API_PASSPHRASE"),
  };
}

async function bitgetRequest(method, requestPath, { params, payload } = {}) {
  const credentials = localCredentials();
  const query = queryString(params);
  const body = payload ? JSON.stringify(payload) : "";
  const timestamp = String(Date.now() + bitgetClockOffsetMs);
  const signature = bitgetSignature({ timestamp, method, requestPath, query, body, secret: credentials.secret });
  return jsonRequest(`${BITGET_BASE}${requestPath}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      "ACCESS-KEY": credentials.apiKey,
      "ACCESS-SIGN": signature,
      "ACCESS-PASSPHRASE": credentials.passphrase,
      "ACCESS-TIMESTAMP": timestamp,
      "Content-Type": "application/json",
      locale: "zh-CN",
    },
    ...(body ? { body } : {}),
  });
}

async function mooxPlan(symbol) {
  const base = (process.env.MOOX_BASE_URL || "https://mooxintel.com").replace(/\/$/, "");
  const token = required("MOOX_SIGNAL_TOKEN");
  return jsonRequest(`${base}/api/v1/member/trading/plans/current?symbol=${encodeURIComponent(symbol)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
}

export function validatePlan(plan, now = Date.now(), requestedSymbol = "") {
  const errors = [];
  if (plan?.schema !== "moonx.member.trading-plan.v1") errors.push("计划协议版本错误");
  if (!plan?.planId || !Number.isInteger(plan?.version) || !/^[a-f0-9]{24}$/.test(plan?.revisionId || "")) errors.push("计划版本身份不完整");
  if (requestedSymbol && plan?.symbol !== requestedSymbol) errors.push("返回计划品种与请求不一致");
  if (!plan?.authority?.valid || !plan?.authority?.forecastId || !plan?.authority?.forecastVersion) errors.push("正式预测权威无效");
  if (!plan?.authority?.publishedAt || Date.parse(plan.authority.publishedAt) > now) errors.push("正式预测尚未发布");
  if (!plan?.authority?.lockedAt || Date.parse(plan.authority.lockedAt) > now) errors.push("正式预测尚未锁定");
  if (!plan?.authority?.validUntil || Date.parse(plan.authority.validUntil) < now) errors.push("正式预测已经过期");
  if (!plan?.evidence?.formalPublishedPlanOnly || !plan?.evidence?.researchOnlyExcluded) errors.push("研究证据隔离标记缺失");
  if (typeof plan?.evidence?.sourcePlanContentHash !== "string" || plan.evidence.sourcePlanContentHash.trim().length < 8) errors.push("锁定计划内容身份缺失");
  if (!plan?.risk?.memberLocalAgentEligible || plan?.risk?.serverExecutionAllowed !== false) errors.push("计划未授权会员本地Agent候选");
  if (!plan?.risk?.tradingEligible || !["LONG_READY", "SHORT_READY"].includes(plan?.state)) errors.push("计划尚未进入READY");
  if (plan?.state === "LONG_READY" && plan?.authority?.direction !== "LONG") errors.push("多头状态与正式方向冲突");
  if (plan?.state === "SHORT_READY" && plan?.authority?.direction !== "SHORT") errors.push("空头状态与正式方向冲突");
  if (!plan?.chan?.timeframes?.length || plan.chan.timeframes.some((row) => !row.available || !row.complete)) errors.push("缠论周期数据不完整");
  const generatedAge = now - Date.parse(plan?.generatedAt || "");
  if (!Number.isFinite(generatedAge) || generatedAge < 0 || generatedAge > 120_000) errors.push("MOOX计划快照超过120秒");
  const price = Number(plan?.execution?.currentPrice);
  const stop = Number(plan?.execution?.stopLoss);
  const targets = plan?.execution?.takeProfits?.map(Number) || [];
  if (!(price > 0 && stop > 0 && targets.length === 3 && targets.every((value) => value > 0))) errors.push("价格或保护价不完整");
  if (price > 0 && stop > 0 && targets.length === 3) {
    const geometry = plan.authority.direction === "LONG"
      ? stop < price && targets.every((value, index) => value > price && (index === 0 || value >= targets[index - 1]))
      : stop > price && targets.every((value, index) => value < price && (index === 0 || value <= targets[index - 1]));
    if (!geometry) errors.push("止盈止损几何与正式方向冲突");
  }
  if (errors.length) throw new Error(errors.join("；"));
  return plan;
}

export function assertPermissionSafety(info, runMode) {
  const permissions = Array.isArray(info?.permissions) ? info.permissions.map((value) => String(value).toLowerCase()) : [];
  const dangerous = permissions.filter((value) => FORBIDDEN_PERMISSIONS.some((word) => value.includes(word)));
  if (dangerous.length) throw new Error(`API Key含禁止权限：${dangerous.join(",")}`);
  if (!permissions.includes("uta_trade")) throw new Error("API Key缺少 uta_trade 权限");
  if (!permissions.includes("uta_mgt")) throw new Error("API Key缺少 uta_mgt 只读权限，无法核对账户与风控");
  if (runMode === "LIVE" && info?.permType !== "read-and-write") throw new Error("LIVE要求Bitget读写API Key");
  if (runMode === "LIVE" && !String(info?.ips || "").trim()) throw new Error("LIVE要求Bitget API Key绑定IP白名单");
  return true;
}

export function assertLiveOptIn(runMode, environment = process.env) {
  if (runMode !== "LIVE") return;
  if (environment.MOOX_ENABLE_LIVE !== "true" || environment.MOOX_LIVE_CONFIRMATION !== LIVE_CONFIRMATION) {
    throw new Error(`LIVE未启用：必须同时设置 MOOX_ENABLE_LIVE=true 和 MOOX_LIVE_CONFIRMATION=${LIVE_CONFIRMATION}`);
  }
}

function validateSymbol(value) {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,16}USDT$/.test(symbol)) throw new Error(`仅支持Bitget USDT合约：${value}`);
  return symbol;
}

async function readState(runMode) {
  try {
    const parsed = JSON.parse(await readFile(STATE_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.executions || typeof parsed.executions !== "object") throw new Error("本地状态格式无效");
    return parsed;
  } catch (error) {
    if (existsSync(STATE_FILE) && runMode !== "PAPER") throw new Error(`本地状态损坏，拒绝连接交易所：${error instanceof Error ? error.message : error}`);
    return { version: 1, executions: {} };
  }
}

async function saveState(state) {
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(STATE_FILE, 0o600).catch(() => undefined);
}

function executionKey(plan) {
  return `${plan.planId}:v${plan.version}:${plan.revisionId}`;
}

export function updateRiskLedger(state, equity, runMode, now = new Date()) {
  const value = numeric(equity, "账户权益");
  if (!(value > 0)) throw new Error("账户权益必须大于0");
  const day = now.toISOString().slice(0, 10);
  if (!state.riskLedger) {
    if (runMode === "LIVE") throw new Error("首次LIVE前必须先成功运行DRY_RUN建立本地风险基线");
    state.riskLedger = { day, dayStartEquity: value, highWaterEquity: value, currentEquity: value, initializedAt: now.toISOString() };
    return state.riskLedger;
  }
  const ledger = state.riskLedger;
  for (const field of ["dayStartEquity", "highWaterEquity", "currentEquity"]) if (!(Number(ledger[field]) > 0)) throw new Error("本地风险账本损坏");
  if (ledger.day !== day) { ledger.day = day; ledger.dayStartEquity = value; }
  ledger.highWaterEquity = Math.max(Number(ledger.highWaterEquity), value);
  ledger.currentEquity = value;
  const dailyLossPct = Math.max(0, (Number(ledger.dayStartEquity) - value) / Number(ledger.dayStartEquity) * 100);
  const drawdownPct = Math.max(0, (Number(ledger.highWaterEquity) - value) / Number(ledger.highWaterEquity) * 100);
  if (dailyLossPct >= 2) throw new Error("本地账户当日亏损达到2%，拒绝新增敞口");
  if (drawdownPct >= 10) throw new Error("本地账户高水位回撤达到10%，拒绝新增敞口");
  return ledger;
}

function oid(prefix, plan) {
  return `${prefix}_${createHash("sha256").update(executionKey(plan)).digest("hex").slice(0, 22)}`.slice(0, 32);
}

function numeric(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}不是有效数字`);
  return number;
}

export function normalizedQuantity(raw, instrument, referencePrice = 0) {
  const step = numeric(instrument?.quantityMultiplier, "数量倍数");
  const minimum = numeric(instrument?.minOrderQty, "最小数量");
  const precision = Number(instrument?.quantityPrecision);
  if (!Number.isInteger(precision) || precision < 0 || precision > 18) throw new Error("数量精度无效");
  const value = Math.floor(raw / step) * step;
  if (value < minimum) throw new Error("风控仓位低于交易所最小下单量，拒绝放大仓位");
  if (referencePrice > 0 && value * referencePrice < numeric(instrument?.minOrderAmount, "最小下单金额")) {
    throw new Error("风控仓位低于交易所最小下单金额，拒绝放大仓位");
  }
  return value.toFixed(precision);
}

export function clockOffset(started, ended, response) {
  return numeric(response?.data?.serverTime, "Bitget服务器时间") - Math.round((started + ended) / 2);
}

async function syncClock() {
  const started = Date.now();
  const response = await jsonRequest(`${BITGET_BASE}/api/v2/public/time`);
  const ended = Date.now();
  bitgetClockOffsetMs = clockOffset(started, ended, response);
  if (Math.abs(bitgetClockOffsetMs) > 5_000) throw new Error("本机时钟与Bitget相差超过5秒，拒绝签名交易");
}

async function accountSafety(runMode) {
  await syncClock();
  const response = await bitgetRequest("GET", "/api/v3/account/info");
  if (response.code !== "00000") throw new Error(`账户自检失败：${response.msg}`);
  assertPermissionSafety(response.data, runMode);
  return response.data;
}

export function assertAccountSettings(settings, symbol, leverageCap) {
  if (!["unified", "hybrid"].includes(settings?.accountMode)) throw new Error("账户未处于可核验的UTA模式");
  if (settings?.holdMode !== "hedge_mode") throw new Error("本地Agent v1仅支持Bitget双向持仓模式 hedge_mode");
  const product = (settings?.symbolConfigList || []).find((row) => row.category === CATEGORY && row.symbol === symbol);
  if (!product || product.marginMode !== "isolated") throw new Error(`${symbol}必须先在Bitget设为逐仓模式 isolated`);
  if (numeric(product.leverage, "品种杠杆") > leverageCap) throw new Error(`${symbol}杠杆超过本地上限`);
  return true;
}

async function accountSettings(symbol, leverageCap) {
  const response = await bitgetRequest("GET", "/api/v3/account/settings");
  if (response.code !== "00000") throw new Error(`账户设置读取失败：${response.msg}`);
  assertAccountSettings(response.data, symbol, leverageCap);
  return response.data;
}

async function accountAssets() {
  const response = await bitgetRequest("GET", "/api/v3/account/assets");
  if (response.code !== "00000") throw new Error(`账户资产读取失败：${response.msg}`);
  return response.data;
}

async function currentPositions(symbol = "") {
  const response = await bitgetRequest("GET", "/api/v3/position/current-position", { params: { category: CATEGORY, ...(symbol ? { symbol } : {}) } });
  if (response.code !== "00000") throw new Error(`持仓读取失败：${response.msg}`);
  return positionList(response);
}

export function positionList(response) {
  return Array.isArray(response?.data?.list) ? response.data.list : [];
}

async function instrument(symbol) {
  const response = await jsonRequest(`${BITGET_BASE}/api/v3/market/instruments?category=${CATEGORY}&symbol=${encodeURIComponent(symbol)}`);
  if (response.code !== "00000") throw new Error(`合约参数读取失败：${response.msg}`);
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

async function marketTicker(symbol) {
  const response = await jsonRequest(`${BITGET_BASE}/api/v3/market/tickers?category=${CATEGORY}&symbol=${encodeURIComponent(symbol)}`);
  if (response.code !== "00000") throw new Error(`实时行情读取失败：${response.msg}`);
  return Array.isArray(response.data) ? response.data[0] : null;
}

export function executionQuote(plan, ticker, now = Date.now()) {
  if (!ticker || ticker.symbol !== plan.symbol || ticker.category !== CATEGORY) throw new Error("实时行情品种不匹配");
  const ts = numeric(ticker.ts, "行情时间");
  if (now - ts < 0 || now - ts > 5_000) throw new Error("Bitget实时行情超过5秒");
  const price = numeric(ticker.markPrice || ticker.lastPrice, "Bitget执行价格");
  const planned = numeric(plan.execution.currentPrice, "计划价格");
  if (Math.abs(price - planned) / planned > 0.005) throw new Error("Bitget执行价格偏离MOOX计划超过0.5%");
  const [low, high] = plan.execution.entryZone.map(Number);
  const confirmation = Number(plan.execution.confirmationAboveOrBelow);
  const inZone = Number.isFinite(low) && Number.isFinite(high) && price >= Math.min(low, high) && price <= Math.max(low, high);
  const confirmed = plan.authority.direction === "LONG" ? price >= confirmation : price <= confirmation;
  if (!inZone && !(Number.isFinite(confirmation) && confirmed)) throw new Error("实时价格既不在锁定入场区也未越过确认位");
  return price;
}

function immutablePlanIdentity(plan) {
  return JSON.stringify({
    planId: plan.planId, version: plan.version, revisionId: plan.revisionId, symbol: plan.symbol,
    sourcePlanContentHash: plan.evidence.sourcePlanContentHash, authority: plan.authority, risk: plan.risk,
    entryZone: plan.execution.entryZone, confirmation: plan.execution.confirmationAboveOrBelow,
    stopLoss: plan.execution.stopLoss, takeProfits: plan.execution.takeProfits,
  });
}

export function normalizedPrice(raw, contract) {
  const multiplier = numeric(contract?.priceMultiplier, "价格倍数");
  const precision = Number(contract?.pricePrecision);
  if (!Number.isInteger(precision) || precision < 0 || precision > 18) throw new Error("价格精度无效");
  return (Math.round(numeric(raw, "保护价格") / multiplier) * multiplier).toFixed(precision);
}

export function assertContract(contract, qty) {
  if (contract?.status !== "online") throw new Error("合约当前不可交易");
  if (numeric(qty, "下单数量") > numeric(contract?.maxMarketOrderQty, "市价单最大数量")) throw new Error("下单数量超过市价单上限");
  return true;
}

function protectionPrices(plan, contract) {
  const current = numeric(plan.execution.currentPrice, "当前价格");
  const stopLoss = normalizedPrice(plan.execution.stopLoss, contract);
  const takeProfit = normalizedPrice(plan.execution.takeProfits[0], contract);
  const valid = plan.authority.direction === "LONG"
    ? Number(stopLoss) < current && current < Number(takeProfit)
    : Number(stopLoss) > current && current > Number(takeProfit);
  if (!valid) throw new Error("价格规范化跨越当前价，拒绝下单");
  return { stopLoss, takeProfit };
}

function calculateQuantity(plan, assets, positions, contract) {
  const equity = numeric(assets?.accountEquity, "账户权益");
  const accountLeverage = numeric(assets?.leverage || 0, "账户杠杆");
  const maxAccountLeverage = numberEnv("MOOX_MAX_ACCOUNT_LEVERAGE", 2, 1, 3);
  if (accountLeverage > maxAccountLeverage) throw new Error("账户当前杠杆超过本地上限");
  const price = numeric(plan.execution.currentPrice, "当前价格");
  const stop = numeric(plan.execution.stopLoss, "止损价格");
  const stopDistance = Math.abs(price - stop);
  if (!(stopDistance > 0)) throw new Error("止损距离无效");
  const riskPct = Math.min(numeric(plan.risk.riskPerTradePct, "计划风险"), numberEnv("MOOX_MAX_RISK_PER_TRADE_PCT", 0.5, 0.1, 1));
  const positionPct = Math.min(numeric(plan.risk.maxPositionPct, "计划仓位"), numberEnv("MOOX_MAX_POSITION_PCT", 5, 1, 5));
  const existingValue = positions.reduce((sum, row) => sum + Math.abs(numeric(row.positionValue || 0, "持仓价值")), 0);
  const totalCap = equity * numberEnv("MOOX_MAX_TOTAL_POSITION_PCT", 20, 5, 20) / 100;
  const byRisk = equity * riskPct / 100 / stopDistance;
  const byPosition = equity * positionPct / 100 / price;
  const byTotal = Math.max(0, totalCap - existingValue) / price;
  return normalizedQuantity(Math.min(byRisk, byPosition, byTotal), contract, price);
}

export function confirmedOrderIdentity(order, { clientOid, symbol, posSide }) {
  return order?.clientOid === clientOid && order?.symbol === symbol && order?.posSide === posSide
    && ["filled", "partially_filled"].includes(order?.orderStatus) && numeric(order?.cumExecQty, "累计成交量") > 0;
}

async function confirmOrder(clientOid, symbol, posSide) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await bitgetRequest("GET", "/api/v3/trade/order-info", { params: { clientOid } });
    if (response.code === "00000" && confirmedOrderIdentity(response.data, { clientOid, symbol, posSide })) {
      const positions = await currentPositions(symbol);
      if (positions.some((row) => row.symbol === symbol && row.posSide === posSide && Math.abs(Number(row.total || 0)) > 0)) return { order: response.data, positions };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("交易所已接收请求但未确认成交与持仓；停止后续动作，请人工核对");
}

async function reconcileExisting(record, plan, runMode) {
  const symbol = plan.symbol;
  if (runMode === "PAPER" || record.mode === "PAPER") return { symbol, status: "IDEMPOTENT", record };
  await accountSafety(runMode);
  const positions = await currentPositions(symbol);
  if (record.mode === "DRY_RUN") return { symbol, status: "IDEMPOTENT", record };
  if (!record.clientOid) throw new Error("本地记录缺少clientOid，拒绝重复下单，请人工对账");
  const order = await bitgetRequest("GET", "/api/v3/trade/order-info", { params: { clientOid: record.clientOid } });
  const positionOpen = positions.some((row) => row.symbol === symbol && row.posSide === record.posSide && Math.abs(Number(row.total || 0)) > 0);
  if (order.code !== "00000" || !confirmedOrderIdentity(order.data, { clientOid: record.clientOid, symbol, posSide: record.posSide }) || !positionOpen) {
    throw new Error("本地记录与交易所订单/持仓不一致，已停止，不会重复下单");
  }
  const contract = await instrument(symbol);
  const prices = protectionPrices(plan, contract);
  const protection = await placeProtection(plan, record.posSide, prices);
  return { symbol, status: "RECONCILED_OPEN_PROTECTED", record: { ...record, protectionOrderId: protection.orderId } };
}

export function preflightDisposition(response, expected) {
  if (String(response?.code) === "25204") return "ABSENT";
  if (String(response?.code) !== "00000") throw new Error(`下单前查单失败：${response?.code} ${response?.msg || "未知错误"}`);
  if (!confirmedOrderIdentity(response.data, expected)) throw new Error("clientOid对应订单身份或成交状态不匹配");
  return "RECOVER";
}

export function strategyProtectionMatches(row, expected) {
  return row?.clientOid === expected.clientOid && row?.symbol === expected.symbol && row?.posSide === expected.posSide
    && row?.status === "pending" && row?.tpTriggerBy === "mark" && row?.slTriggerBy === "mark"
    && String(row?.takeProfit) === expected.takeProfit && String(row?.stopLoss) === expected.stopLoss;
}

async function placeProtection(plan, posSide, prices) {
  const clientOid = oid("mxp", plan);
  const expected = { clientOid, symbol: plan.symbol, posSide, ...prices };
  const lookup = async () => {
    const check = await bitgetRequest("GET", "/api/v3/trade/unfilled-strategy-orders", {
      params: { category: CATEGORY, symbol: plan.symbol, type: "tpsl" },
    });
    if (check.code !== "00000") throw new Error(`保护单查询失败：${check.code} ${check.msg || "未知错误"}`);
    return Array.isArray(check.data) ? check.data.find((row) => strategyProtectionMatches(row, expected)) : null;
  };
  const existing = await lookup();
  if (existing) return existing;
  const payload = {
      category: CATEGORY,
      symbol: plan.symbol,
      type: "tpsl",
      tpslMode: "full",
      posSide,
      reduceOnly: "yes",
      takeProfit: prices.takeProfit,
      stopLoss: prices.stopLoss,
      tpTriggerBy: "mark",
      slTriggerBy: "mark",
      tpOrderType: "market",
      slOrderType: "market",
      clientOid,
  };
  let response;
  try { response = await bitgetRequest("POST", "/api/v3/trade/place-strategy-order", { payload }); }
  catch { response = { code: "TRANSPORT_AMBIGUOUS" }; }
  if (!["00000", "25001", "25212", "TRANSPORT_AMBIGUOUS"].includes(String(response.code))) {
    throw new Error(`保护单提交失败：${response.code} ${response.msg || "未知错误"}`);
  }
  const confirmed = await lookup();
  if (!confirmed) {
    throw new Error("保护单未在交易所待执行列表确认；立即停止并人工处理持仓");
  }
  return confirmed;
}

async function paper(plan, state) {
  const key = executionKey(plan);
  if (state.executions[key]) return { status: "IDEMPOTENT", record: state.executions[key] };
  const record = { mode: "PAPER", planId: plan.planId, version: plan.version, revisionId: plan.revisionId, symbol: plan.symbol, price: plan.execution.currentPrice, createdAt: new Date().toISOString() };
  state.executions[key] = record;
  await saveState(state);
  return { status: "PAPER_RECORDED", record };
}

async function executeSymbol(symbol, runMode, state) {
  const plan = validatePlan(await mooxPlan(symbol), Date.now(), symbol);
  if (executionKey(plan) in state.executions) {
    return reconcileExisting(state.executions[executionKey(plan)], plan, runMode);
  }
  if (runMode === "PAPER") return paper(plan, state);
  await accountSafety(runMode);
  const leverageCap = Math.min(numeric(plan.risk.leverageCap, "计划杠杆上限"), numberEnv("MOOX_MAX_ACCOUNT_LEVERAGE", 2, 1, 3));
  const [settings, assets, positions, contract] = await Promise.all([accountSettings(plan.symbol, leverageCap), accountAssets(), currentPositions(), instrument(plan.symbol)]);
  const expectedSide = plan.authority.direction === "LONG" ? "long" : "short";
  if (!settings) throw new Error("账户设置不可用");
  updateRiskLedger(state, assets?.accountEquity, runMode);
  await saveState(state);
  if (runMode === "DRY_RUN") {
    if (positions.some((row) => Math.abs(Number(row.total || 0)) > 0)) throw new Error("账户已有USDT合约持仓；本地Agent v1拒绝新增任何敞口");
    const dryQty = calculateQuantity(plan, assets, [], contract);
    assertContract(contract, dryQty);
    const record = { mode: "DRY_RUN", planId: plan.planId, version: plan.version, revisionId: plan.revisionId, symbol: plan.symbol, qty: dryQty, createdAt: new Date().toISOString() };
    state.executions[executionKey(plan)] = record;
    await saveState(state);
    return { symbol, status: "DRY_RUN_READY", record };
  }
  assertLiveOptIn(runMode);
  const finalPlan = validatePlan(await mooxPlan(symbol), Date.now(), symbol);
  if (immutablePlanIdentity(finalPlan) !== immutablePlanIdentity(plan)) throw new Error("计划锁定内容在下单前发生变化，拒绝执行");
  const expectedSideFinal = finalPlan.authority.direction === "LONG" ? "long" : "short";
  const clientOid = oid("mxe", finalPlan);
  let response = await bitgetRequest("GET", "/api/v3/trade/order-info", { params: { clientOid } });
  const disposition = preflightDisposition(response, { clientOid, symbol: finalPlan.symbol, posSide: expectedSideFinal });
  if (disposition === "RECOVER") {
    const confirmed = await confirmOrder(clientOid, finalPlan.symbol, expectedSideFinal);
    const recoveryPrices = protectionPrices(finalPlan, contract);
    const protection = await placeProtection(finalPlan, expectedSideFinal, recoveryPrices);
    const record = { mode: "LIVE", planId: finalPlan.planId, version: finalPlan.version, revisionId: finalPlan.revisionId, symbol: finalPlan.symbol, posSide: expectedSideFinal, clientOid, orderId: confirmed.order.orderId, protectionOrderId: protection.orderId, createdAt: new Date().toISOString() };
    state.executions[executionKey(finalPlan)] = record;
    await saveState(state);
    return { symbol, status: "LIVE_RECOVERED_PROTECTED", record };
  }
  if (positions.some((row) => Math.abs(Number(row.total || 0)) > 0)) throw new Error("账户已有USDT合约持仓；本地Agent v1拒绝新增任何敞口");
  const quote = executionQuote(finalPlan, await marketTicker(symbol));
  const executionPlan = { ...finalPlan, execution: { ...finalPlan.execution, currentPrice: quote } };
  const qty = calculateQuantity(executionPlan, assets, [], contract);
  assertContract(contract, qty);
  const prices = protectionPrices(executionPlan, contract);
  if (disposition === "ABSENT") {
    assertKillSwitch();
    try {
      response = await bitgetRequest("POST", "/api/v3/trade/place-order", {
        payload: {
          category: CATEGORY,
          symbol: finalPlan.symbol,
          qty,
          side: expectedSideFinal === "long" ? "buy" : "sell",
          posSide: expectedSideFinal,
          orderType: "market",
          marginMode: "isolated",
          reduceOnly: "no",
          takeProfit: prices.takeProfit,
          stopLoss: prices.stopLoss,
          tpTriggerBy: "mark",
          slTriggerBy: "mark",
          tpOrderType: "market",
          slOrderType: "market",
          clientOid,
        },
      });
    } catch {
      response = await bitgetRequest("GET", "/api/v3/trade/order-info", { params: { clientOid } });
    }
  }
  if (response.code !== "00000" || !response.data?.orderId) throw new Error(`下单结果未确认：${response.msg || "clientOid无订单"}`);
  const confirmed = await confirmOrder(clientOid, finalPlan.symbol, expectedSideFinal);
  const presetConfirmed = String(confirmed.order.takeProfit || "") === prices.takeProfit
    && String(confirmed.order.stopLoss || "") === prices.stopLoss
    && confirmed.order.tpTriggerBy === "mark" && confirmed.order.slTriggerBy === "mark";
  if (!presetConfirmed) throw new Error("初始订单止盈止损未按预期确认；停止并人工处理持仓");
  const protection = await placeProtection(finalPlan, expectedSideFinal, prices);
  const record = { mode: "LIVE", planId: finalPlan.planId, version: finalPlan.version, revisionId: finalPlan.revisionId, symbol: finalPlan.symbol, posSide: expectedSideFinal, clientOid, orderId: confirmed.order.orderId, protectionOrderId: protection.orderId, createdAt: new Date().toISOString() };
  state.executions[executionKey(finalPlan)] = record;
  await saveState(state);
  return { symbol, status: "LIVE_CONFIRMED_PROTECTED", presetConfirmed, record };
}

export async function main() {
  if (process.argv.includes("--self-test")) {
    const signature = bitgetSignature({ timestamp: "16273667805456", method: "GET", requestPath: "/api/v3/account/fee-rate", query: "category=SPOT&symbol=BTCUSDT", secret: "secret" });
    let rejectsInvalidPlan = false;
    try { validatePlan({ schema: "bad" }); } catch { rejectsInvalidPlan = true; }
    let rejectsLiveWithoutOptIn = false;
    try { assertLiveOptIn("LIVE", {}); } catch { rejectsLiveWithoutOptIn = true; }
    console.log(JSON.stringify({ ok: Boolean(signature) && rejectsInvalidPlan && rejectsLiveWithoutOptIn, version: VERSION, defaultMode: mode(), liveConfirmation: LIVE_CONFIRMATION }));
    return;
  }
  const runMode = mode();
  assertLiveOptIn(runMode);
  const symbols = (process.env.MOOX_SYMBOLS || "BTCUSDT").split(",").map(validateSymbol);
  const state = await readState(runMode);
  const results = [];
  for (const symbol of symbols) {
    try {
      results.push(await executeSymbol(symbol, runMode, state));
    } catch (error) {
      results.push({ symbol, status: "FAILED_CLOSED", error: error instanceof Error ? error.message : String(error) });
    }
  }
  console.log(JSON.stringify({ version: VERSION, mode: runMode, killSwitch: KILL_FILE, results }, null, 2));
  if (results.some((row) => row.status === "FAILED_CLOSED")) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
