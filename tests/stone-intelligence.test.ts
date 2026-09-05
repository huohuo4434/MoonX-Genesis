import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { build } from "esbuild";
import { latestStoneFindings, sortStoneBatches, stoneBatchSchema } from "../lib/stone-intelligence/core.ts";

const sample = () => ({ observedAt: "2026-09-05T12:00:00Z", coverage: [{ source: "ARTICLES", url: "https://www.patreon.com/cw/StoneInvestment/posts", range: "示例范围", status: "PARTIAL" }], assessment: "仅测试，不是真实群聊。", findings: [{ id: "test-claim", source: "ARTICLES", sourceUrl: "https://www.patreon.com/posts/example", author: "test", asset: "TEST", title: "测试观点", publishedTimeLabel: "页面相对时间", summary: "未核实", status: "UNVERIFIED", evidenceUrls: [], followUp: "查原始公告", alignment: "未对照" }] });
async function load(entry: string, mocks: Record<string, Record<string, unknown>>) {
  const bindings: Record<string, unknown>[] = [];
  const output = await build({ entryPoints: [resolve(entry)], bundle: true, write: false, platform: "node", format: "cjs", plugins: [{ name: "mock-io", setup(b) {
    b.onResolve({ filter: /.*/ }, (a) => a.path === "server-only" ? { path: a.path, namespace: "empty" } : mocks[a.path] ? { path: a.path, namespace: "mock" } : undefined);
    b.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};" }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => { const value = mocks[a.path]; const i = bindings.push(value) - 1; return { contents: Object.keys(value).map((k) => `export const ${k}=bindings[${i}][${JSON.stringify(k)}];`).join("\n") }; });
  } }] });
  const mod = { exports: {} as any };
  new Function("module", "exports", "bindings", "require", output.outputFiles[0].text)(mod, mod.exports, bindings, createRequire(import.meta.url));
  return mod.exports;
}
test("schema rejects raw extra fields, unsafe links, duplicate IDs and facts without evidence", () => {
  assert.equal(stoneBatchSchema.safeParse(sample()).success, true);
  for (const mutate of [
    (x: any) => { x.rawTranscript = "not allowed"; },
    (x: any) => { x.findings[0].sourceUrl = "javascript:alert(1)"; },
    (x: any) => { x.findings[0].sourceUrl = "https://example.com"; },
    (x: any) => { x.findings[0].evidenceUrls = ["https://user:secret@example.com/"]; },
    (x: any) => { x.findings[0].status = "FACT_CHECKED"; },
    (x: any) => { x.findings.push(x.findings[0]); },
    (x: any) => { x.findings[0].summary = "x".repeat(421); },
  ]) { const x = sample(); mutate(x); assert.equal(stoneBatchSchema.safeParse(x).success, false); }
});
test("newer revisions supersede display without mutating failed/expired history", () => {
  const a: any = { ...sample(), key: "old", storedAt: "2026-09-05T12:00:01Z" };
  const b: any = structuredClone(a); b.observedAt = "2026-09-05T13:00:00Z"; b.key = "new"; b.findings[0].status = "CONTRADICTED";
  const before = JSON.stringify([a, b]);
  assert.equal(latestStoneFindings([a, b])[0].status, "CONTRADICTED");
  assert.equal(JSON.stringify([a, b]), before);
});

test("timestamps are bounded and equivalent ISO forms share revision ordering", () => {
  for (const observedAt of ["1960-01-01T00:00:00Z", "2100-01-01T00:00:00Z"]) assert.equal(stoneBatchSchema.safeParse({ ...sample(), observedAt }).success, false);
  for (const observedAt of ["2000-01-01T00:00:00Z", "2099-12-31T23:59:59Z"]) {
    assert.equal(stoneBatchSchema.safeParse({ ...sample(), observedAt }).success, true);
    assert.match(String(Date.parse(observedAt)).padStart(13, "0"), /^\d{13}$/);
  }
  const older: any = { ...sample(), key: "zzz", storedAt: "2026-09-05T12:00:01Z" };
  const newer: any = { ...sample(), observedAt: "2026-09-05T12:00:00.000Z", key: "aaa", storedAt: "2026-09-05T12:00:01.100Z", assessment: "new" };
  newer.findings[0].status = "CONTRADICTED";
  assert.equal(sortStoneBatches([older, newer])[0].assessment, "new");
  assert.equal(latestStoneFindings([older, newer])[0].status, "CONTRADICTED");
});
test("API rejects anonymous and ordinary members before storage access", async () => {
  let reads = 0; let writes = 0;
  const mod = await load("app/api/admin/stone-intelligence/route.ts", {
    "next/server": { NextResponse: { json: (body: any, init: any) => Response.json(body, init) } },
    "@/lib/auth/permissions": { requireAdmin: async () => null },
    "@/lib/stone-intelligence/store": { listStoneBatches: () => { reads++; }, saveStoneBatch: () => { writes++; } },
  });
  assert.equal((await mod.GET()).status, 403); assert.equal((await mod.POST({})).status, 403); assert.equal(reads + writes, 0);
});
test("API blocks cross-origin writes and safely reports storage read failure", async () => {
  let writes = 0;
  const mod = await load("app/api/admin/stone-intelligence/route.ts", {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/auth/permissions": { requireAdmin: async () => ({ id: "test" }) },
    "@/lib/stone-intelligence/store": { listStoneBatches: () => { throw new Error("private-secret"); }, saveStoneBatch: () => { writes++; } },
  });
  const request: any = new Request("https://mooxintel.com/api/admin/stone-intelligence", { method: "POST", headers: { origin: "https://evil.invalid", "Content-Type": "application/json" }, body: JSON.stringify(sample()) }); request.nextUrl = new URL(request.url);
  assert.equal((await mod.POST(request)).status, 403); assert.equal(writes, 0);
  const res = await mod.GET(); assert.equal(res.status, 503); assert.doesNotMatch(await res.text(), /private-secret/); assert.match(res.headers.get("cache-control")!, /no-store/);
});
async function storeHarness(options: { public?: boolean; readError?: boolean; uploadError?: boolean } = {}) {
  const files = new Map<string, string>(); let uploads = 0;
  const store = {
    upload: async (key: string, body: string, opts: any) => { uploads++; assert.equal(opts.upsert, false); if (options.uploadError || files.has(key)) return { error: { message: "error" } }; files.set(key, body); return { error: null }; },
    download: async (key: string) => files.has(key) ? { data: new Blob([files.get(key)!]), error: null } : { data: null, error: { message: "missing" } },
    list: async (_prefix: string, opts: any) => { assert.equal(opts.sortBy.column, "created_at"); return options.readError ? { data: null, error: { message: "error" } } : { data: [...files.keys()].reverse().slice(opts.offset, opts.offset + opts.limit).map((x) => ({ name: x.replace("batches/", "") })), error: null }; },
  };
  const mod = await load("lib/stone-intelligence/store.ts", { "@/lib/supabase/admin": { getAdminClient: () => ({ storage: { getBucket: async () => ({ data: { public: options.public ?? false }, error: null }), from: () => store } }) } });
  return { mod, files, uploads: () => uploads };
}
test("store uses private append-only objects; repeated imports are idempotent", async () => {
  const h = await storeHarness();
  assert.equal((await h.mod.saveStoneBatch(sample())).duplicate, false);
  assert.equal((await h.mod.saveStoneBatch(sample())).duplicate, true);
  assert.equal(h.files.size, 1);
  assert.equal((await h.mod.listStoneBatches()).batches.length, 1);
});

test("stored revisions read in shared numeric order and older archives remain pageable", async () => {
  const h = await storeHarness();
  for (let i = 0; i < 32; i++) {
    await h.mod.saveStoneBatch({ ...sample(), assessment: `revision-${i}` });
    const key = [...h.files.keys()].at(-1)!;
    const saved = JSON.parse(h.files.get(key)!); saved.storedAt = new Date(Date.parse(sample().observedAt) + i * 1000).toISOString(); h.files.set(key, JSON.stringify(saved));
  }
  const first = await h.mod.listStoneBatches();
  assert.equal(first.batches.length, 30); assert.equal(first.hasMore, true); assert.equal(first.batches[0].assessment, "revision-31");
  const second = await h.mod.listStoneBatches(30); assert.equal(second.batches.length, 2); assert.equal(second.hasMore, false);
  await assert.rejects(h.mod.listStoneBatches(-1), /INVALID_OFFSET/);
  await assert.rejects(h.mod.saveStoneBatch({ ...sample(), observedAt: "1960-01-01T00:00:00Z" }));
});
test("public bucket, failed upload, failed read and future observation fail closed", async () => {
  const p = await storeHarness({ public: true }); await assert.rejects(p.mod.saveStoneBatch(sample()), /NOT_PRIVATE/); assert.equal(p.uploads(), 0);
  const u = await storeHarness({ uploadError: true }); await assert.rejects(u.mod.saveStoneBatch(sample()), /UNCONFIRMED/);
  const r = await storeHarness({ readError: true }); await assert.rejects(r.mod.listStoneBatches(), /READ_FAILED/);
  const h = await storeHarness(); await assert.rejects(h.mod.saveStoneBatch({ ...sample(), observedAt: "2099-01-01T00:00:00Z" }), /FUTURE/);
});
test("page authorizes before rendering and no trading/public publication is wired", () => {
  const page = readFileSync("app/admin/stone-intelligence/page.tsx", "utf8");
  assert.ok(page.indexOf("await requireAdminOrNotFound()") < page.indexOf("return <main"));
  const source = ["lib/stone-intelligence/store.ts", "app/api/admin/stone-intelligence/route.ts", "components/admin/StoneIntelligenceClient.tsx"].map((p) => readFileSync(p, "utf8")).join("\n");
  assert.doesNotMatch(source, /lib\/bitget|lib\/trading-signals|generatedDailyForecast|dangerouslySetInnerHTML|getPublicUrl/);
});
