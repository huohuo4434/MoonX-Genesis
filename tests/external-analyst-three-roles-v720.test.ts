import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { prepareExternalAnalystCollectorPosts } from "../lib/trading-signals/external-analyst-collector-core";
import { analystSourceFromUsername, parseExternalAnalystPost } from "../lib/trading-signals/external-analyst-parser";
import { applyExternalAnalystOverlay } from "../lib/trading-signals/external-analyst-overlay";
import type { ExternalAnalystOverlay } from "../types/external-analyst";
import {
  buildExternalAnalystOverlayFromRows,
  resolveFormalExternalOverlayDirection,
} from "../lib/trading-signals/external-analyst-aggregation-core";

const allowed = new Set(["mat78704", "btctw0", "btckik"]);
const post = (username: string, id: string, text: string) => ({ username, id, text, createdAt: "2026-08-14T00:00:00.000Z" });

test("three accounts map authoritatively and a mixed batch preserves per-post source", () => {
  assert.equal(analystSourceFromUsername("mat78704"), "MAT78704");
  assert.equal(analystSourceFromUsername("BTCTW0"), "BTCTW0");
  assert.equal(analystSourceFromUsername("btckik"), "BTCKIK");
  const result = prepareExternalAnalystCollectorPosts({ allowedAccounts: allowed, posts: [
    post("mat78704", "1", "BTC 看多，周线周期共振。"),
    post("BTCTW0", "2", "BTC 江恩周期窗口，本周守住63000支撑。"),
    post("btckik", "3", "$PENGU 低位关注。"),
  ] });
  assert.deepEqual(result.accepted.map((row) => row.source), ["MAT78704", "BTCTW0", "BTCKIK"]);
});

test("unknown account is rejected and duplicate source/id is idempotently collapsed", () => {
  const result = prepareExternalAnalystCollectorPosts({ allowedAccounts: new Set([...allowed, "unknown"]), posts: [
    post("unknown", "x", "BTC看多"),
    post("mat78704", "same", "BTC看多"),
    post("mat78704", "same", "BTC看多"),
  ] });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.rejected.map((row) => row.reason), ["SOURCE_NOT_REGISTERED"]);
});

test("collector accounting classifies malformed and truncated inputs", () => {
  const posts = Array.from({ length: 121 }, (_, index) => post("mat78704", String(index), "BTC看多"));
  posts[0] = { ...posts[0], text: "" };
  const result = prepareExternalAnalystCollectorPosts({ allowedAccounts: allowed, posts });
  assert.equal(result.accepted.length + result.rejected.length + result.duplicateCount + result.truncatedCount, posts.length);
  assert.equal(result.truncatedCount, 1);
  assert.equal(result.rejected[0]?.reason, "MALFORMED_POST");
});

test("formal overlay direction never falls back from neutral weekly to BUY_DIP setup", () => {
  const direction = resolveFormalExternalOverlayDirection({ strategyType: "SWING", nowMs: Date.parse("2026-08-14T00:00:00Z"), weekly: { status: "LOCKED", publishedAt: "2026-08-13T00:00:00Z", lockedAt: "2026-08-13T00:00:00Z", direction: "NEUTRAL" }, monthly: null });
  assert.equal(direction, "NEUTRAL");
  const technicalBuyDip = { direction: "LONG" as const, confidence: 60, forecastScore: 70, conditions: [], currentPrice: 100, entryPrice: 100, stopLoss: 95, target1: 108, target2: 112, ready: false, raw: { setup: "BUY_DIP" } };
  const matLong: ExternalAnalystOverlay = { symbol: "BTCUSDT", strategyType: "SWING", direction: "LONG", confidence: 70, supportLevels: [], resistanceLevels: [], targetLevels: [], invalidationLevels: [], timeWindows: ["本周"], sourceLabels: ["mat78704"], sourceUrls: [], summaries: [], newestPostedAt: "2026-08-14T00:00:00Z", sources: ["MAT78704"], roles: ["DIRECTION_CYCLE_RESONANCE"] };
  const result = applyExternalAnalystOverlay({ evaluation: technicalBuyDip, overlay: matLong, strategyType: "SWING", primaryForecastDirection: direction });
  assert.equal(result.direction, "LONG");
  assert.ok(result.confidence <= technicalBuyDip.confidence);
  assert.equal(result.ready, false);
});

test("mixed rows keep MAT direction separate and Gann levels only from BTCTW0", () => {
  const nowMs = Date.parse("2026-08-14T12:00:00Z");
  const rows = [
    { source: "MAT78704", username: "mat78704", post_id: "m", post_url: "m", posted_at: "2026-08-14T10:00:00Z", text: "BTC 看空，周线周期向下。", parsed: {} },
    { source: "BTCTW0", username: "BTCTW0", post_id: "g", post_url: "g", posted_at: "2026-08-14T09:00:00Z", text: "BTC 江恩周期看多，63000支撑，68000压力。", parsed: {} },
    { source: "BTCKIK", username: "mat78704", post_id: "legacy-mat", post_url: "x", posted_at: "2026-08-14T09:00:00Z", text: "BTC 看空，周线周期向下。", parsed: { source: "BTCKIK", direction: "LONG" } },
    { source: "BTCKIK", username: "BTCTW0", post_id: "legacy-gann", post_url: "g2", posted_at: "2026-08-14T08:00:00Z", text: "BTC 江恩周期观察，61000支撑。", parsed: { source: "BTCKIK", supportLevels: [99999] } },
    { source: "MAT78704", username: "unknown", post_id: "u", post_url: "u", posted_at: "2026-08-14T09:00:00Z", text: "BTC看多", parsed: {} },
    { source: "MAT78704", username: "mat78704", post_id: "future", post_url: "f", posted_at: "2026-08-14T13:00:00Z", text: "BTC看多", parsed: {} },
  ];
  const overlay = buildExternalAnalystOverlayFromRows({ rows, symbol: "BTCUSDT", strategyType: "SWING", nowMs });
  assert.equal(overlay?.direction, "SHORT");
  assert.ok(overlay?.supportLevels.includes(63000));
  assert.ok(overlay?.supportLevels.includes(61000));
  assert.ok(overlay?.resistanceLevels.includes(68000));
  assert.ok(!overlay?.supportLevels.includes(99999) && !overlay?.resistanceLevels.includes(99999));
  assert.equal(overlay?.observations?.length, 4);
});

test("MAT resonance adds at most three only when explicit fresh overlay aligns with formal direction", () => {
  const evaluation = { direction: "LONG" as const, confidence: 60, forecastScore: 70, conditions: [], currentPrice: 100, entryPrice: 100, stopLoss: 95, target1: 108, target2: 112, ready: false, raw: {} };
  const overlay: ExternalAnalystOverlay = { symbol: "BTCUSDT", strategyType: "SWING", direction: "LONG", confidence: 70, supportLevels: [], resistanceLevels: [], targetLevels: [], invalidationLevels: [], timeWindows: ["本周"], sourceLabels: ["mat78704"], sourceUrls: [], summaries: [], newestPostedAt: "2026-08-14T00:00:00Z", sources: ["MAT78704"], roles: ["DIRECTION_CYCLE_RESONANCE"], observations: [{ source: "MAT78704", role: "DIRECTION_CYCLE_RESONANCE", direction: "LONG", confidence: 70, postedAt: "2026-08-14T00:00:00Z" }] };
  const aligned = applyExternalAnalystOverlay({ evaluation, overlay, strategyType: "SWING", primaryForecastDirection: "LONG" });
  assert.equal(aligned.confidence, 63);
  assert.equal(aligned.ready, false);
  const conflict = applyExternalAnalystOverlay({ evaluation, overlay: { ...overlay, direction: "SHORT", observations: [{ source: "MAT78704", role: "DIRECTION_CYCLE_RESONANCE", direction: "SHORT", confidence: 70, postedAt: "2026-08-14T00:00:00Z" }] }, strategyType: "SWING", primaryForecastDirection: "LONG" });
  assert.equal(conflict.direction, "LONG");
  assert.ok(conflict.confidence < evaluation.confidence);
  const noFormal = applyExternalAnalystOverlay({ evaluation, overlay, strategyType: "SWING", primaryForecastDirection: "NEUTRAL" });
  assert.ok(noFormal.confidence <= evaluation.confidence);
  const internallySplit = applyExternalAnalystOverlay({
    evaluation,
    overlay: { ...overlay, observations: [
      { source: "MAT78704", role: "DIRECTION_CYCLE_RESONANCE", direction: "LONG", confidence: 70, postedAt: "2026-08-14T00:00:00Z" },
      { source: "MAT78704", role: "DIRECTION_CYCLE_RESONANCE", direction: "SHORT", confidence: 70, postedAt: "2026-08-14T00:01:00Z" },
    ] },
    strategyType: "SWING",
    primaryForecastDirection: "LONG",
  });
  assert.equal(internallySplit.confidence, evaluation.confidence);
  assert.equal((internallySplit.raw.externalAnalyst as { matDirection: string; alignment: string }).matDirection, "NEUTRAL");
  assert.equal((internallySplit.raw.externalAnalyst as { matDirection: string; alignment: string }).alignment, "CONFLICT");
  assert.equal(internallySplit.conditions.at(-1)?.met, false);
  assert.equal((internallySplit.raw.externalAnalyst as { applied: boolean }).applied, false);
});

test("pure MAT research never reports Gann levels as applied", () => {
  const evaluation = { direction: "LONG" as const, confidence: 60, forecastScore: 70, conditions: [], currentPrice: 100, entryPrice: 100, stopLoss: 95, target1: 108, target2: 112, ready: false, raw: {} };
  const overlay: ExternalAnalystOverlay = { symbol: "BTCUSDT", strategyType: "SWING", direction: "LONG", confidence: 70, supportLevels: [], resistanceLevels: [], targetLevels: [], invalidationLevels: [], timeWindows: [], sourceLabels: ["mat78704"], sourceUrls: [], summaries: [], newestPostedAt: "2026-08-14T00:00:00Z", sources: ["MAT78704"], roles: ["DIRECTION_CYCLE_RESONANCE"], observations: [{ source: "MAT78704", role: "DIRECTION_CYCLE_RESONANCE", direction: "LONG", confidence: 70, postedAt: "2026-08-14T00:00:00Z" }] };
  const result = applyExternalAnalystOverlay({ evaluation, overlay, strategyType: "SWING", primaryForecastDirection: "LONG" });
  assert.equal(result.confidence, 63);
  assert.equal((result.raw.externalAnalyst as { applied: boolean }).applied, false);
  assert.deepEqual((result.raw.externalAnalyst as { adjustedLevels: unknown }).adjustedLevels, { stopLoss: 95, target1: 108, target2: 112 });
});

test("Gann applied is true only when accepted levels actually change the plan", () => {
  const evaluation = { direction: "LONG" as const, confidence: 60, forecastScore: 70, conditions: [], currentPrice: 100, entryPrice: 100, stopLoss: null, target1: null, target2: null, ready: false, raw: {} };
  const overlay: ExternalAnalystOverlay = { symbol: "BTCUSDT", strategyType: "SWING", direction: "NEUTRAL", confidence: 60, supportLevels: [95], resistanceLevels: [110, 118], targetLevels: [], invalidationLevels: [], timeWindows: [], sourceLabels: ["BTCTW0"], sourceUrls: [], summaries: [], newestPostedAt: "2026-08-14T00:00:00Z", sources: ["BTCTW0"], roles: ["GANN_LEVEL_CYCLE"] };
  const result = applyExternalAnalystOverlay({ evaluation, overlay, strategyType: "SWING", primaryForecastDirection: "LONG" });
  assert.equal((result.raw.externalAnalyst as { applied: boolean }).applied, true);
  assert.notEqual(result.stopLoss, evaluation.stopLoss);
  assert.notEqual(result.target2, evaluation.target2);
});

test("BTCTW0 rejects vague numbers but accepts explicit symbol and Gann context", () => {
  const vague = parseExternalAnalystPost({ source: "BTCTW0", username: "BTCTW0", postId: "v", postUrl: "x", postedAt: "2026-08-14T00:00:00Z", text: "今天看到 12345 和 67890，继续观察。" });
  assert.equal(vague.researchEligible, false);
  const explicit = parseExternalAnalystPost({ source: "BTCTW0", username: "BTCTW0", postId: "g", postUrl: "x", postedAt: "2026-08-14T00:00:00Z", text: "BTC 江恩周期本周观察，63000支撑，站稳后看多。" });
  assert.equal(explicit.researchEligible, true);
  assert.deepEqual(explicit.symbols, ["BTCUSDT"]);
  assert.ok(explicit.supportLevels.includes(63000));
});

test("Gann refinement cannot reduce an already valid original reward risk", () => {
  const evaluation = { direction: "LONG" as const, confidence: 60, forecastScore: 70, conditions: [], currentPrice: 100, entryPrice: 100, stopLoss: 90, target1: 115, target2: 130, ready: false, raw: {} };
  const overlay: ExternalAnalystOverlay = { symbol: "BTCUSDT", strategyType: "SWING", direction: "LONG", confidence: 65, supportLevels: [95], resistanceLevels: [110, 118], targetLevels: [], invalidationLevels: [], timeWindows: [], sourceLabels: ["BTCTW0"], sourceUrls: [], summaries: [], newestPostedAt: "2026-08-14T00:00:00Z", sources: ["BTCTW0"], roles: ["GANN_LEVEL_CYCLE"] };
  const result = applyExternalAnalystOverlay({ evaluation, overlay, strategyType: "SWING", primaryForecastDirection: "LONG" });
  assert.equal(result.stopLoss, 90);
  assert.equal(result.target2, 130);
  assert.match(String((result.raw.externalAnalyst as { rejection?: string }).rejection), /低于原计划/);
});

test("BTCKIK remains altcoin radar only and mainstream mentions do not become discovery symbols", () => {
  const mainstream = parseExternalAnalystPost({ source: "BTCKIK", username: "btckik", postId: "m", postUrl: "x", postedAt: "2026-08-14T00:00:00Z", text: "$BTC 和 $ETH 看多。" });
  assert.deepEqual(mainstream.symbols, []);
  assert.equal(mainstream.researchEligible, false);
  const aggregation = readFileSync(resolve(process.cwd(), "lib/trading-signals/external-analyst-aggregation-core.ts"), "utf8");
  assert.match(aggregation, /if \(source === "BTCKIK"\) return false/);
});

test("collector config includes mat78704 without adding a Windows scheduler", () => {
  const config = readFileSync(resolve(process.cwd(), "tools/x-collector/default-config.json"), "utf8");
  const configure = readFileSync(resolve(process.cwd(), "tools/x-collector/configure.ps1"), "utf8");
  assert.match(config, /"mat78704"/);
  assert.match(configure, /"mat78704"/);
  assert.doesNotMatch(configure, /Register-ScheduledTask|schtasks/i);
});

test("production overlay query uses one captured now as both freshness and future-post boundary", () => {
  const signals = readFileSync(resolve(process.cwd(), "lib/trading-signals/external-analyst-signals.ts"), "utf8");
  assert.match(signals, /posted_at >= \$1::timestamptz - INTERVAL '45 days'/);
  assert.match(signals, /posted_at <= \$1::timestamptz/);
  assert.match(signals, /`, now\.toISOString\(\)\)/);
});
