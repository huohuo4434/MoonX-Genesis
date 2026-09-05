import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";
import { rotatingCryptoBatch, selectCryptoBeijingV2Candidates } from "../lib/verification/crypto-beijing-v2-candidates.ts";

// Execute production modules with only I/O boundaries replaced. No DB, credentials,
// HTTP requests or production writes; standard node --import tsx --test command.
async function loadModule(entry: string, mocks: Record<string, Record<string, unknown>>) {
  const bindings: Record<string, unknown>[] = [];
  const output = await build({
    entryPoints: [resolve(entry)], bundle: true, write: false, platform: "node", format: "cjs",
    plugins: [{ name: "isolated-io", setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => {
        if (args.path === "server-only") return { path: args.path, namespace: "empty" };
        if (mocks[args.path]) return { path: args.path, namespace: "mock" };
        return undefined;
      });
      builder.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export {};" }));
      builder.onLoad({ filter: /.*/, namespace: "mock" }, (args) => {
        const item = mocks[args.path]!;
        const index = bindings.push(item) - 1;
        return { contents: Object.keys(item).map((key) => `export const ${key} = __testBindings[${index}][${JSON.stringify(key)}];`).join("\n") };
      });
    } }],
  });
  const module = { exports: {} as any };
  new Function("module", "exports", "__testBindings", output.outputFiles[0]!.text)(module, module.exports, bindings);
  return module.exports;
}

const now = new Date("2026-09-05T12:00:00Z");
const forecast = (id = "a", extra = {}) => ({
  id, forecastDate: "2026-08-09", assetName: "BTC", symbol: "BTC", quoteSymbol: "BTC-USD",
  market: "CRYPTO", direction: "UP", directionLabel: "上涨", status: "verified",
  publishedAt: "2026-08-08T12:00:00Z", cutoffAt: "2026-08-08T16:00:00Z",
  originalVersion: 1, source: "test", isSystemTest: false, ...extra,
});
const prior = (id = "a", extra = {}) => ({ forecastId: id, verdict: "HIT", dataSource: "old", verifiedAt: "2026-08-10T00:00:00Z", ...extra });

async function verifierHarness(input: { forecasts?: any[]; results?: any[]; market?: () => unknown; verdict?: string; failWrite?: boolean } = {}) {
  const forecasts = input.forecasts ?? [forecast(), forecast("outside")];
  const results = input.results ?? [prior(), prior("outside")];
  const calls = { market: [] as string[], forecastWrites: [] as any[], resultWrites: [] as any[], sync: 0, reviews: 0 };
  const recordResult = async (value: any) => {
    if (input.failWrite) throw new Error("write failed");
    calls.resultWrites.push(value);
    return { created: true };
  };
  const market = input.market ?? (() => ({ previousClose: 100, open: 100, high: 110, low: 90, close: 95, dataSource: "yahoo-finance-hourly-beijing:BTC-USD; crypto-beijing-v2" }));
  const emptySync = { created: 0, existing: 0, unsupported: 0, latePublished: 0, errors: [], deferred: 0 };
  const mod = await loadModule("lib/verification/run-daily.ts", {
    "@/lib/data/daily-accuracy-store": {
      listDailyForecastRecords: async () => forecasts, listDailyVerificationResults: async () => results,
      replaceDailyVerificationResult: recordResult, upsertDailyVerificationResult: recordResult,
      upsertDailyForecastRecord: async (row: any) => { calls.forecastWrites.push(row); },
    },
    "@/lib/market-data/daily-prices": {
      getDailyMarketResult: async (row: any) => { calls.market.push(row.symbol); return market(); },
      fetchIntradayBarsForVerification: async () => [], fetchRecentDailyBarsForForecast: async () => [],
    },
    "@/lib/market-data/quote-symbols": { resolveCanonicalQuoteSymbol: (_symbol: string, quote: string) => quote, quoteSanityFailure: () => null },
    "@/lib/verification/pattern-classifier": { computeAtrPct: () => null },
    "@/lib/verification/daily-rules": {
      buildHitMissResult: (x: any) => ({ forecastId: x.record.id, verdict: input.verdict ?? "MISS", dataSource: x.dataSource }),
      buildManualReviewResult: (f: any, error: string, dataSource: string) => ({ forecastId: f.id, verdict: "MANUAL_REVIEW", errorMessage: error, dataSource }),
      buildVoidResult: (f: any) => ({ forecastId: f.id, verdict: "VOID", dataSource: "calendar" }),
      isPublishedBeforeCutoff: (f: any) => new Date(f.publishedAt) <= new Date(f.cutoffAt), looksLikeFuturesRoll: () => false,
    },
    "@/lib/accuracy/public-history-filter": { selectCanonicalDailyForecasts: (rows: any[]) => rows },
    "@/lib/verification/sync-generated-dailies": { syncGeneratedDailyForecastsToVerificationStore: async () => { calls.sync++; return emptySync; } },
    "@/lib/verification/sync-focus-generated-dailies": { syncFocusGeneratedDailiesToVerificationStore: async () => { calls.sync++; return emptySync; } },
    "@/lib/automation/generate-reviews": { generateReviewsForVerified: async () => { calls.reviews++; return { created: 0, skipped: 0, deferred: 0 }; } },
  });
  return { calls, forecasts, results, run: (extra = {}) => mod.runDailyVerification({ now, forecastIds: ["a"], forceRefetchForecastIds: ["a"], cryptoBeijingMigration: true, ...extra }) };
}

test("migration executes strict scope and accepts HIT to MISS without changing locked forecasts", async () => {
  const h = await verifierHarness();
  const original = structuredClone(h.forecasts);
  const report = await h.run();
  assert.equal(report.verified, 1);
  assert.deepEqual(h.calls.resultWrites.map((r) => [r.forecastId, r.verdict]), [["a", "MISS"]]);
  assert.equal(h.calls.market.length, 1);
  assert.deepEqual(h.calls.forecastWrites, []);
  assert.deepEqual(h.forecasts, original);
  assert.equal(h.calls.sync + h.calls.reviews, 0);
});

test("empty scope never becomes a full scan; migration requires scope", async () => {
  const h = await verifierHarness();
  assert.equal((await h.run({ forecastIds: [] })).scanned, 0);
  assert.equal(h.calls.market.length + h.calls.sync + h.calls.reviews + h.calls.resultWrites.length, 0);
  await assert.rejects(h.run({ forecastIds: undefined }), /explicit forecastIds/);
});

for (const [name, override] of Object.entries({
  unavailable: { market: () => ({ error: "no data" }) },
  closed: { market: () => ({ error: "closed", marketClosed: true }) },
  thrown: { market: () => { throw new Error("provider failed"); } },
  noMarker: { market: () => ({ close: 95, previousClose: 100, dataSource: "old" }) },
  manual: { verdict: "MANUAL_REVIEW" },
  unverifiable: { verdict: "UNVERIFIABLE" },
  void: { verdict: "VOID" },
  late: { forecasts: [forecast("a", { publishedAt: "2026-08-10T00:00:00Z" })] },
  invalid: { forecasts: [forecast("a", { status: "invalid" })] },
  future: { forecasts: [forecast("a", { forecastDate: "2026-09-06" })] },
  systemTest: { forecasts: [forecast("a", { isSystemTest: true })] },
  missingPrior: { results: [] },
  failedWrite: { failWrite: true },
})) {
  test(`migration preserves prior before all writes: ${name}`, async () => {
    const h = await verifierHarness(override);
    const before = structuredClone(h.results);
    const report = await h.run();
    assert.deepEqual(h.calls.resultWrites, []);
    assert.deepEqual(h.calls.forecastWrites, []);
    assert.deepEqual(h.results, before);
    assert.equal(report.verified, 0);
    assert.equal(report.preservedPrior, name === "failedWrite" ? 0 : 1);
    assert.equal(report.writeOutcomeUnknown, name === "failedWrite" ? 1 : 0);
    for (const field of ["verified", "voided", "manualReview", "finalizedUnverifiable"]) assert.ok(report[field] >= 0, field);
  });
}

test("deadline and count defer rows without mutating them", async () => {
  const h = await verifierHarness({ forecasts: [forecast("a"), forecast("b")], results: [prior("a"), prior("b")] });
  const report = await h.run({ forecastIds: ["a", "b"], forceRefetchForecastIds: ["a", "b"], maxRecords: 1 });
  assert.equal(report.verified, 1);
  assert.equal(report.deferred, 1);
  const expired = await verifierHarness();
  assert.equal((await expired.run({ deadlineAt: 0 })).deferred, 1);
  assert.equal(expired.calls.market.length + expired.calls.resultWrites.length, 0);
});

test("rotating failed history cannot starve later candidates", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const selected = new Set(Array.from({ length: 3 }, (_, hour) => rotatingCryptoBatch(ids, new Date(hour * 3_600_000))).flat());
  assert.deepEqual([...selected].sort(), ids);
  assert.deepEqual(rotatingCryptoBatch([], now), []);
});

test("normal daily verification defers backlog, skips future sessions and preserves finalized results", async () => {
  const h = await verifierHarness({
    forecasts: [forecast("future", { forecastDate: "2026-09-06", status: "published" }), forecast("done"), forecast("a", { status: "published" }), forecast("b", { status: "published" })],
    results: [prior("done")],
  });
  const report = await h.run({ cryptoBeijingMigration: false, forecastIds: undefined, forceRefetchForecastIds: [], maxRecords: 1 });
  assert.equal(report.verified, 1);
  assert.equal(report.notReady, 1);
  assert.equal(report.deferred, 1);
  assert.equal(report.skippedExisting, 1);
  assert.equal(h.calls.sync, 2);
  assert.equal(h.calls.reviews, 1);
  assert.deepEqual(h.calls.resultWrites.map((r) => r.forecastId), ["a"]);
  assert.ok(h.calls.forecastWrites.every((row) => row.id === "a"));
});

test("cutoff reached during a record completes its write then defers the next", async () => {
  const originalNow = Date.now;
  let clock = 100;
  Date.now = () => clock;
  try {
    const h = await verifierHarness({
      forecasts: [forecast("a"), forecast("b")], results: [prior("a"), prior("b")],
      market: () => { clock = 300; return { close: 95, previousClose: 100, dataSource: "crypto-beijing-v2" }; },
    });
    const report = await h.run({ forecastIds: ["a", "b"], forceRefetchForecastIds: ["a", "b"], deadlineAt: 200 });
    assert.equal(report.verified, 1);
    assert.equal(report.deferred, 1);
    assert.equal(h.calls.resultWrites.length, 1);
  } finally { Date.now = originalNow; }
});

test("crypto production wrapper passes bounded strict scope and never invokes restore writes", async () => {
  let options: any;
  const mod = await loadModule("lib/verification/crypto-beijing-v2-reverify.ts", {
    "@/lib/data/daily-accuracy-store": {
      listDailyForecastRecords: async () => ["a", "b", "c", "d", "e"].map((id) => forecast(id)),
      listDailyVerificationResults: async () => ["a", "b", "c", "d", "e"].map((id) => prior(id)),
    },
    "@/lib/verification/run-daily": { runDailyVerification: async (input: any) => {
      options = input; return { verified: 1, preservedPrior: 0, deferred: 0, writeOutcomeUnknown: 0, errors: [] };
    } },
  });
  const report = await mod.runCryptoBeijingV2Reverification();
  assert.deepEqual(options.forecastIds, options.forceRefetchForecastIds);
  assert.ok(options.forecastIds.length <= 2);
  assert.equal(options.maxRecords, 2);
  assert.equal(options.cryptoBeijingMigration, true);
  assert.equal(report.candidates, 5);
  assert.equal(report.upgraded, 1);
  assert.equal(report.restoredPrior, 0);
});

test("crypto wrapper never counts unknown writes or deferred rows as unchanged", async () => {
  const mod = await loadModule("lib/verification/crypto-beijing-v2-reverify.ts", {
    "@/lib/data/daily-accuracy-store": {
      listDailyForecastRecords: async () => [forecast("a"), forecast("b")],
      listDailyVerificationResults: async () => [prior("a"), prior("b")],
    },
    "@/lib/verification/run-daily": { runDailyVerification: async () => ({ verified: 0, preservedPrior: 0, deferred: 1, writeOutcomeUnknown: 1, errors: ["write failed"] }) },
  });
  const report = await mod.runCryptoBeijingV2Reverification();
  assert.equal(report.unchanged, 0);
  assert.equal(report.deferred, 1);
  assert.equal(report.writeOutcomeUnknown, 1);
});

test("member-stock backlog has count and deadline gates before quotes or writes", async () => {
  let quotes = 0;
  const writes: string[] = [];
  const mod = await loadModule("lib/data/member-stocks/verify.ts", {
    "@/lib/data/member-stocks/store": {
      listAllDailyForecasts: async () => ["a", "b", "c"].map((id) => ({ id, stockId: id, forecastDate: "2026-08-07", status: "published", role: "today", accuracyEligible: true, primaryDirection: "上涨" })),
      listStockVerifications: async () => [], getBenefitStock: () => ({ quoteSymbol: "test.SS" }),
      upsertDailyForecast: async () => {}, upsertStockVerification: async (r: any) => { writes.push(r.forecastId); },
    },
    "@/lib/market-data/daily-prices": { getDailyMarketResult: async () => { quotes++; return { previousClose: 100, close: 110 }; } },
  });
  const report = await mod.runMemberStockVerification(now, { maxRecords: 1, deadlineAt: Date.now() + 10000 });
  assert.equal(report.verified, 1);
  assert.equal(report.deferred, 2);
  assert.equal(quotes, 1);
  assert.deepEqual(writes, ["a"]);
  assert.equal((await mod.runMemberStockVerification(now, { deadlineAt: 0 })).deferred, 3);
  assert.equal(quotes, 1);
});

test("review backlog caps new writes without counting already-reviewed history as deferred", async () => {
  const writes: string[] = [];
  const mod = await loadModule("lib/automation/generate-reviews.ts", {
    "@/lib/data/moonx-data-store": {
      listDailyForecastRecords: async () => ["done", "a", "b"].map((id) => forecast(id)),
      listDailyVerificationResults: async () => ["done", "a", "b"].map((id) => prior(id)),
      listDailyReviews: async () => [{ forecastId: "done" }],
      upsertDailyReview: async (r: any) => { writes.push(r.forecastId); return { created: true }; },
      upsertLearningCase: async () => {},
    },
    "@/lib/teacher-voice-learning/feedback": { recordTeacherLearningFeedback: async () => {} },
  });
  const report = await mod.generateReviewsForVerified(now, { maxRecords: 1, deadlineAt: Date.now() + 10000 });
  assert.deepEqual(writes, ["a"]);
  assert.equal(report.created, 1);
  assert.equal(report.skipped, 1);
  assert.equal(report.deferred, 1);
});

for (const provider of ["yahoo", "coingecko"]) {
  test(`${provider} real successful market path retains migration marker and leaves next batch`, async () => {
    const originalFetch = globalThis.fetch;
    const timestamps = ["2026-08-08T00:00:00+08:00", "2026-08-08T23:00:00+08:00", "2026-08-09T00:00:00+08:00", "2026-08-09T23:00:00+08:00"].map(Date.parse);
    globalThis.fetch = async (url: any) => {
      if (provider === "coingecko" && String(url).includes("yahoo")) return new Response("", { status: 503 });
      return Response.json(String(url).includes("coingecko") ? { prices: timestamps.map((ts) => [ts, 60000]) } : {
        chart: { result: [{ timestamp: timestamps.map((ts) => ts / 1000), indicators: { quote: [{ open: [60000, 60000, 60000, 60000], high: [60100, 60100, 60100, 60100], low: [59900, 59900, 59900, 59900], close: [60000, 60000, 60000, 60000] }] } }] },
      });
    };
    try {
      const mod = await loadModule("lib/market-data/daily-prices.ts", {});
      const result = await mod.getDailyMarketResult({ symbol: "BTC", quoteSymbol: "BTC-USD", market: "CRYPTO", forecastDate: "2026-08-09" });
      assert.equal(result.error, undefined);
      assert.match(result.dataSource, /crypto-beijing-v2/);
      assert.deepEqual(selectCryptoBeijingV2Candidates([forecast() as any], [prior("a", { dataSource: result.dataSource }) as any]), []);
    } finally { globalThis.fetch = originalFetch; }
  });
}

test("all three routes deny missing/wrong credentials and spoofed UA before work", async () => {
  const secret = process.env.CRON_SECRET;
  let calls = 0;
  const unexpected = () => { calls++; throw new Error("unauthorized work"); };
  try {
    for (const route of ["verify-daily", "crypto-beijing-reverify", "x-intelligence-report"]) {
      const mod = await loadModule(`app/api/cron/${route}/route.ts`, {
        "next/server": { NextResponse: { json: Response.json } },
        "@/lib/data/member-stocks/verify": { runMemberStockVerification: unexpected },
        "@/lib/verification/run-daily": { runDailyVerification: unexpected },
        "@/lib/verification/crypto-beijing-v2-reverify": { runCryptoBeijingV2Reverification: unexpected },
        "@/lib/trading-signals/early-altcoin-radar": { generateAndStoreEarlyAltcoinRadar: unexpected },
        "@/lib/trading-signals/x-scan-report": { generateAndStoreXScanReport: unexpected },
      });
      assert.equal(mod.maxDuration, 300);
      for (const configured of [undefined, "", "   ", "expected"]) {
        if (configured === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = configured;
        const response = await mod.GET(new Request("https://local.invalid", { headers: { "user-agent": "vercel-cron/1.0", authorization: "Bearer wrong" } }));
        assert.equal(response.status, 401);
      }
    }
    assert.equal(calls, 0);
  } finally { if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret; }
});

test("X partial completion is explicit and never invokes site repair", async () => {
  const secret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-only";
  let repair = 0;
  try {
    const mod = await loadModule("app/api/cron/x-intelligence-report/route.ts", {
      "next/server": { NextResponse: { json: Response.json } },
      "@/lib/trading-signals/early-altcoin-radar": { generateAndStoreEarlyAltcoinRadar: async () => { throw new Error("unavailable"); } },
      "@/lib/trading-signals/x-scan-report": { generateAndStoreXScanReport: async () => ({ generatedAt: now.toISOString(), assets: [], buyCandidateCount: 0 }) },
      "@/lib/automation/content-freshness": { runContentFreshnessSelfCheck: () => { repair++; } },
    });
    const response = await mod.GET(new Request("https://local.invalid", { headers: { authorization: "Bearer test-only" } }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.partial, true);
    assert.equal(body.ok, false);
    assert.equal(body.freshnessDeferred, true);
    assert.equal(repair, 0);
  } finally { if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret; }
});
