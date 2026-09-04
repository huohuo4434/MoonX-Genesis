import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as core from "../lib/trading-signals/live-configuration-draft-core.ts";
const source = readFileSync("lib/trading-signals/live-configuration-draft-store.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const draft = { durationMode: "CONTINUOUS", durationDays: null, capitalUsdt: "2000.00" };
const request = (suffix = "000000000001", expectedRevision = null) => ({ draft, expectedRevision, actorId: "admin", requestId: `00000000-0000-4000-8000-${suffix}` });
function harness() {
  let rows = [], writes = 0, failCreate = false, chain = Promise.resolve();
  const untouched = { experiment: "COMPLETED", initial: 1000.8, peak: 1006.56, mode: "LIVE", riskLimit: 10 };
  const baseline = JSON.stringify(untouched);
  const model = {
    async findUnique({ where }) { return rows.find((row) => row.id === where.id) ?? null; },
    async findFirst({ where, orderBy }) {
      assert.equal(where.accountId, "official-id"); assert.equal(where.code, core.LIVE_CONFIGURATION_DRAFT_CODE);
      assert.equal(orderBy[0].createdAt, "desc");
      return rows.filter((row) => row.code === where.code).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
    },
    async create({ data }) {
      if (failCreate) throw new Error("audit persistence failed");
      assert.equal(data.severity, "INFO"); writes++; rows.push(data); return data;
    },
  };
  const database = {
    mooxUnifiedLiveAccount: { findUnique: async () => ({ id: "official-id" }) }, mooxUnifiedLiveEvent: model,
    async $transaction(callback) {
      const prior = chain; let unlock; chain = new Promise((resolve) => { unlock = resolve; });
      await prior;
      const snapshot = rows.slice();
      try {
        return await callback({ mooxUnifiedLiveEvent: model, $queryRaw: async (sql) => {
          assert.match(sql.join(""), /WHERE "ownerKey" = 'official' FOR UPDATE/);
          return [{ id: "official-id" }];
        } });
      } catch (error) { rows = snapshot; throw error; }
      finally { assert.equal(JSON.stringify(untouched), baseline); unlock(); }
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require(name) {
    if (name === "@/lib/prisma") return { prisma: database };
    if (name === "./live-configuration-draft-core") return core;
    throw new Error(`unexpected dependency ${name}`);
  } });
  return { api: exports, writes: () => writes, rows: () => rows, fail() { failCreate = true; } };
}
test("append-only config version is saved; identical retry produces no second write", async () => {
  const h = harness(); const first = await h.api.saveLiveConfigurationDraft(request());
  const second = await h.api.saveLiveConfigurationDraft(request());
  assert.deepEqual(second, first); assert.equal(h.writes(), 1); assert.equal(first.applied, false);
  assert.equal(first.draft.capitalUsdt, "2000.00");
  assert.deepEqual(await h.api.getLiveConfigurationDraft(), first);
  await assert.rejects(h.api.saveLiveConfigurationDraft({ ...request(), draft: { ...draft, capitalUsdt: "500" } }), /CONFLICT/);
  await assert.rejects(h.api.saveLiveConfigurationDraft({ ...request(), actorId: "another-admin" }), /CONFLICT/);
});
test("concurrent stale writers cannot overwrite each other; successor preserves prior record", async () => {
  const h = harness();
  const results = await Promise.allSettled([h.api.saveLiveConfigurationDraft(request()), h.api.saveLiveConfigurationDraft(request("000000000002"))]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(h.writes(), 1);
  const previous = (await h.api.getLiveConfigurationDraft()).revision;
  const before = JSON.stringify(h.rows()[0]);
  const next = await h.api.saveLiveConfigurationDraft(request("000000000003", previous));
  assert.equal(h.writes(), 2); assert.notEqual(next.revision, previous);
  assert.equal(JSON.stringify(h.rows()[0]), before);
  assert.equal(JSON.parse(h.rows()[1].detail).previousRevision, previous);
});
test("invalid revision and failed audit cannot succeed or mutate trading records", async () => {
  const h = harness();
  await assert.rejects(h.api.saveLiveConfigurationDraft({ ...request(), expectedRevision: undefined }), /INVALID_CONFIGURATION/);
  h.fail(); await assert.rejects(h.api.saveLiveConfigurationDraft(request()), /audit persistence failed/);
  assert.equal(h.rows().length, 0);
  assert.doesNotMatch(source, /\.update\(|\.upsert\(|\.delete\(|\$executeRaw|syncBitget|placeOrder|setUnifiedLiveMode/);
});
test("a slower server clock cannot put a successor behind the prior revision", async () => {
  const h = harness(); const first = await h.api.saveLiveConfigurationDraft(request());
  h.rows()[0].createdAt = new Date("2100-01-01T00:00:00Z");
  const next = await h.api.saveLiveConfigurationDraft(request("000000000002", first.revision));
  assert.equal(next.savedAt, "2100-01-01T00:00:00.001Z");
  assert.equal((await h.api.getLiveConfigurationDraft()).revision, next.revision);
});
