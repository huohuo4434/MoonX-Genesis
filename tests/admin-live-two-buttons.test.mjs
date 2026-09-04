import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as draftCore from "../lib/trading-signals/live-configuration-draft-core.ts";

// Run the actual component handlers with deterministic hooks and mocked HTTP only.
// No server, credentials, timers or exchange calls are involved.
const source = readFileSync("components/live-trading/AdminLiveTradingClient.tsx", "utf8");
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
} }).outputText;
const healthy = (mode = "MANAGE_ONLY") => ({
  migrationRequired: false, restoreBlockers: [],
  account: { mode, newEntriesEnabled: mode === "LIVE", positionManagementEnabled: true },
  audit: { issues: [], orphanPositions: [] },
});
const response = (payload, status = 200) => ({ ok: status === 200, status, json: async () => payload });
const settle = async () => { for (let n = 0; n < 4; n++) await new Promise(setImmediate); };
function harness(replies, compiled = code) {
  const slots = [], effects = [], requests = [];
  let cursor = 0, mounted = false;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback: (fn) => fn,
    useEffect(fn) { if (!mounted) effects.push(fn); },
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, React: hooks, AbortSignal, Error, crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    require(name) {
      if (name.endsWith("live-configuration-draft-core")) return draftCore;
      if (name === "./LiveConfigurationDraftClient") return { default: () => null };
      assert.equal(name, "react"); return hooks;
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      assert.ok(replies.length, "unexpected HTTP request");
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return typeof next === "function" ? next() : next;
    },
  });
  function render() { cursor = 0; const tree = exports.default(); mounted = true; return tree; }
  function nodes(tree, type) {
    if (!tree || typeof tree !== "object") return [];
    if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
    return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
  }
  return {
    requests, render, nodes,
    async mount() { render(); for (const effect of effects) effect(); await settle(); },
    button(label) { return nodes(render(), "button").find((node) => node.props.children.includes(label)); },
    text() { return JSON.stringify(render()); },
  };
}

test("mount is GET only, with exactly two main buttons and collapsed advanced controls", async () => {
  const ui = harness([response(healthy())]);
  assert.equal(ui.button("一键开启").props.disabled, true);
  await ui.mount();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].method, undefined);
  assert.equal(ui.button("一键开启").props.disabled, false);
  const tree = ui.render();
  assert.equal(ui.nodes(tree.props.children[0], "button").length, 2);
  assert.equal(ui.nodes(tree, "details")[0].props.open, undefined);
  assert.match(ui.text(), /不会自动续期实验/);
});

test("one explicit enable click sends the existing confirmation once; no double submission", async () => {
  let release;
  const ui = harness([response(healthy()), () => new Promise((resolve) => { release = resolve; }), response(healthy("LIVE"))]);
  await ui.mount();
  const click = ui.button("一键开启").props.onClick;
  click(); click();
  assert.equal(ui.requests.length, 2);
  assert.equal(ui.button("一键开启").props.disabled, true);
  assert.equal(ui.button("一键关闭").props.disabled, true);
  assert.deepEqual(JSON.parse(ui.requests[1].body), { action: "SET_MODE", mode: "LIVE", confirmation: "LIVE1000" });
  release(response({ ok: true, account: healthy("LIVE").account }));
  await settle();
  assert.match(ui.text(), /开仓许可请求已确认/);
  assert.equal(ui.button("一键开启").props.disabled, true);
  assert.equal(ui.button("一键关闭").props.disabled, false);
});

test("off sets MANAGE_ONLY, never PAUSED, liquidation, renewal or a new strategy", async () => {
  const ui = harness([response(healthy("LIVE")), response({ ok: true, account: healthy().account }), response(healthy())]);
  await ui.mount();
  ui.button("一键关闭").props.onClick();
  await settle();
  assert.deepEqual(JSON.parse(ui.requests[1].body), { action: "SET_MODE", mode: "MANAGE_ONLY" });
  assert.match(ui.text(), /未执行一键平仓/);
  assert.doesNotMatch(source, /mode: "PAUSED"|aggressive-stage|setLeverage|placeOrder|window\.prompt/);
});

test("blocked, missing, malformed and failed snapshots cannot enable; off remains available", async () => {
  for (const snapshot of [
    response({ ...healthy(), restoreBlockers: [{ code: "CUSTODY", message: "缺保护单" }] }),
    response({ migrationRequired: true, account: null }),
    response({}), response({ ...healthy(), restoreBlockers: null }),
    response({ ...healthy(), restoreBlockers: [null] }),
    response({ ...healthy(), account: { mode: "LIVE" } }),
    response({}, 403), new Error("network down"),
  ]) {
    const ui = harness([snapshot]);
    await ui.mount();
    assert.equal(ui.button("一键开启").props.disabled, true);
    ui.button("一键开启").props.onClick();
    assert.equal(ui.requests.length, 1);
    assert.equal(ui.button("一键关闭").props.disabled, false);
  }
});

test("server refusal stays visible after refresh, rather than turning into success", async () => {
  const ui = harness([response(healthy()), response({ error: "LIVE_SWITCH_BLOCKED", blockers: [{ message: "保护单未通过" }] }, 409), response(healthy())]);
  await ui.mount(); ui.button("一键开启").props.onClick(); await settle();
  assert.match(ui.text(), /操作未完成.*保护单未通过/);
  assert.doesNotMatch(ui.text(), /请求已确认/);
});

test("lost or malformed POST replies never claim success; failed refresh clears stale status", async () => {
  for (const post of [new Error("timeout"), response({}), response({ ok: true, account: healthy().account })]) {
    const ui = harness([response(healthy()), post, new Error("refresh down")]);
    await ui.mount(); ui.button("一键开启").props.onClick(); await settle();
    assert.match(ui.text(), /请求未能确认/);
    assert.match(ui.text(), /最新状态读取失败/);
    assert.doesNotMatch(ui.text(), /请求已确认/);
    assert.equal(ui.button("一键开启").props.disabled, true);
    assert.equal(ui.button("一键关闭").props.disabled, false);
  }
});

test("a delayed initial GET cannot overwrite the newer off result or its status", async () => {
  for (const lateReply of [response(healthy("LIVE")), response({}, 503)]) {
  let release;
  const ui = harness([() => new Promise((resolve) => { release = resolve; }), response({ ok: true, account: healthy().account }), response(healthy())]);
  await ui.mount();
  ui.button("一键关闭").props.onClick(); await settle();
  release(lateReply); await settle();
  assert.match(ui.text(), /关闭新开仓请求已确认/);
  assert.equal(ui.button("一键开启").props.disabled, false);
  }
});

test("an enabled switch plus expired experiment visibly says it cannot open orders", async () => {
  const ui = harness([response({ ...healthy("LIVE"), restoreBlockers: [{ code: "LIVE_EXPERIMENT_EXPIRED", message: "实盘实验已到期" }] })]);
  await ui.mount();
  assert.match(ui.text(), /开关已开，但运行条件未通过/);
  assert.match(ui.text(), /被运行条件阻断/);
  assert.match(ui.text(), /实盘实验已到期/);
  assert.doesNotMatch(ui.text(), /0项阻断/);
  assert.equal(ui.button("一键开启").props.disabled, true);
  assert.equal(ui.button("一键关闭").props.disabled, false);
});

test("renewal preview is opt-in GET only and a failed refresh removes the old snapshot", async () => {
  const preview = { readOnly: true, writeAttempted: false, canRenew: false, checks: [
    { key: "renewal", state: "BLOCKED", label: "续期确认流程", detail: "未开放测试标记" },
  ], generatedAt: "2026-09-04T12:00:00Z", originalEndsAt: "2026-09-03T15:30:36Z" };
  const ui = harness([response(healthy("LIVE")), response(preview), new Error("offline")]);
  await ui.mount();
  const toggle = (open) => ui.nodes(ui.render(), "details")[0].props.onToggle({ currentTarget: { open } });
  toggle(false);
  assert.equal(ui.requests.length, 1);
  toggle(true); await settle();
  assert.equal(ui.requests[1].url, "/api/admin/live-trading/renewal-preview");
  assert.equal(ui.requests[1].method, undefined);
  assert.equal(ui.requests[1].cache, "no-store");
  assert.match(ui.text(), /未开放测试标记/);
  assert.match(ui.text(), /尚未生效/);
  toggle(false); toggle(true); await settle();
  assert.match(ui.text(), /续期预检读取失败/);
  assert.doesNotMatch(ui.text(), /未开放测试标记/);
  assert.ok(ui.requests.every((request) => request.method === undefined));
  assert.equal(ui.button("一键关闭").props.disabled, false);
});

test("preview rejects an unexpected claim that renewal is enabled", async () => {
  const ui = harness([response(healthy()), response({ readOnly: true, writeAttempted: false, canRenew: true, checks: [] })]);
  await ui.mount();
  ui.nodes(ui.render(), "details")[0].props.onToggle({ currentTarget: { open: true } });
  await settle();
  assert.match(ui.text(), /续期预检读取失败/);
  assert.equal(ui.requests.length, 2);
  assert.ok(ui.requests.every((request) => request.method === undefined));
});

test("preview renders continuous, century-long and missing saved configuration without a default month", async () => {
  for (const mode of ["CONTINUOUS", "FIXED", null]) {
    const proposedConfiguration = mode ? {
      applied: false, revision: "r1", savedAt: "2026-09-04T10:00:00Z",
      draft: draftCore.parseLiveConfigurationDraft({ durationMode: mode, durationDays: mode === "FIXED" ? 36525 : null, capitalUsdt: "2345.67" }),
    } : null;
    const ui = harness([response(healthy()), response({
      readOnly: true, writeAttempted: false, canRenew: false, checks: [], proposedConfiguration,
      proposedDurationDays: mode === "FIXED" ? 36525 : null,
      proposedEndsAt: mode === "FIXED" ? "2126-09-05T00:00:00Z" : null,
    })]);
    await ui.mount();
    ui.nodes(ui.render(), "details")[0].props.onToggle({ currentTarget: { open: true } });
    await settle();
    assert.match(ui.text(), mode === "CONTINUOUS" ? /持续运行（无固定到期日）/ : mode === "FIXED" ? /36525天；预计截止/ : /未取得已保存配置/);
    if (mode) assert.match(ui.text(), /2345.67/);
    assert.doesNotMatch(ui.text(), /拟议续期30天/);
    assert.match(ui.text(), /待启用，不是实际可用资金/);
    assert.ok(ui.requests.every((request) => request.method === undefined));
  }
});
test("malformed preview check entries do not crash the management page", async () => {
  for (const checks of [[null], ["bad"], [{ key: "x", label: {}, detail: "x", state: "OK" }]]) {
    const ui = harness([response(healthy()), response({ readOnly: true, writeAttempted: false, canRenew: false, checks })]);
    await ui.mount();
    ui.nodes(ui.render(), "details")[0].props.onToggle({ currentTarget: { open: true } });
    await settle();
    assert.match(ui.text(), /续期预检读取失败/);
    assert.equal(ui.button("一键关闭").props.disabled, false);
  }
});

const configurationSource = readFileSync("components/live-trading/LiveConfigurationDraftClient.tsx", "utf8");
const configurationCode = ts.transpileModule(configurationSource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
} }).outputText;
const emptyConfiguration = { draft: null, revision: null, savedAt: null, applied: false };
const savedConfiguration = { draft: draftCore.parseLiveConfigurationDraft({ durationMode: "CONTINUOUS", capitalUsdt: "2000", leverage: 1 }), revision: "new-version", savedAt: "2026-09-05T00:00:00Z", applied: false };
const openConfiguration = async (ui) => { ui.nodes(ui.render(), "details")[0].props.onToggle({ currentTarget: { open: true } }); await settle(); };
test("configuration form has no automatic write, and saves a continuous 2000U request only once", async () => {
  let release;
  const ui = harness([response(emptyConfiguration), () => new Promise((resolve) => { release = resolve; })], configurationCode);
  await ui.mount(); assert.equal(ui.requests.length, 0);
  assert.equal(ui.button("保存待启用配置").props.disabled, true);
  await openConfiguration(ui);
  assert.equal(ui.requests.length, 1); assert.equal(ui.requests[0].method, undefined);
  ui.nodes(ui.render(), "input")[0].props.onChange({ target: { value: "2000" } });
  ui.nodes(ui.render(), "select")[1].props.onChange({ target: { value: "1" } });
  const click = ui.button("保存待启用配置").props.onClick;
  click(); click();
  assert.equal(ui.requests.length, 2);
  assert.equal(ui.button("保存待启用配置").props.disabled, true);
  assert.deepEqual(JSON.parse(ui.requests[1].body), {
    draft: { durationMode: "CONTINUOUS", durationDays: null, capitalUsdt: "2000.00", leverage: 1 },
    expectedRevision: null, requestId: "00000000-0000-4000-8000-000000000001",
  });
  release(response(savedConfiguration)); await settle();
  assert.match(ui.text(), /配置已保存，尚未启用/);
  assert.match(ui.text(), /不会划转资金或自动下单/);
  assert.equal(ui.requests.length, 2, "no chained SET_MODE or renewal");
  assert.ok(ui.requests.every((request) => request.url.endsWith("/configuration-draft")));
});
test("form rejects empty budget and refuses stale or unconfirmed save results", async () => {
  for (const reply of [response({}, 409), new Error("timeout"), response({ ...savedConfiguration, applied: true })]) {
    const ui = harness([response(emptyConfiguration), reply], configurationCode);
    await ui.mount(); await openConfiguration(ui);
    ui.button("保存待启用配置").props.onClick(); await settle();
    assert.equal(ui.requests.length, 1); assert.match(ui.text(), /预算须为大于0/);
    ui.nodes(ui.render(), "input")[0].props.onChange({ target: { value: "2000" } });
    ui.button("保存待启用配置").props.onClick(); await settle();
    assert.equal(ui.button("保存待启用配置").props.disabled, true);
    assert.doesNotMatch(ui.text(), /配置已保存，尚未启用/);
    assert.match(ui.text(), /另一窗口更新|保存结果未确认/);
  }
});
test("malformed or failed reads do not enable configuration writes", async () => {
  for (const reply of [response({}), response({ ...emptyConfiguration, applied: true }), response({}, 503), new Error("offline")]) {
    const ui = harness([reply], configurationCode); await ui.mount(); await openConfiguration(ui);
    assert.equal(ui.button("保存待启用配置").props.disabled, true);
    ui.button("保存待启用配置").props.onClick(); await settle();
    assert.equal(ui.requests.length, 1);
    assert.match(ui.text(), /配置读取失败/);
  }
});
