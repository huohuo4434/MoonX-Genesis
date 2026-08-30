import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { EXTERNAL_ANALYST_VIEWPOINTS_20260830 } from "../lib/data/external-analyst-viewpoints-20260830";
import {
  assessExternalViewpointCard,
  findDuplicateExternalViewpoints,
} from "../lib/research/external-viewpoint-card-core";

test("2026-08-30 video batch keeps technical calls prospective and narrative lessons note only", () => {
  assert.equal(EXTERNAL_ANALYST_VIEWPOINTS_20260830.length, 7);
  assert.equal(findDuplicateExternalViewpoints(EXTERNAL_ANALYST_VIEWPOINTS_20260830).length, 0);
  const assessed = EXTERNAL_ANALYST_VIEWPOINTS_20260830.map((card) => ({
    card,
    result: assessExternalViewpointCard(card),
  }));
  assert.ok(assessed.every(({ result }) => result.accepted));
  assert.equal(assessed.filter(({ result }) => result.forwardScoreEligible).length, 4);
  assert.equal(assessed.filter(({ card }) => card.status === "NOTE_ONLY").length, 3);
  assert.ok(assessed.every(({ card, result }) => card.consensusEligible === false && result.tradingEligible === false));
});

test("BTC and ETH levels preserve source horizons and explicit invalidation", () => {
  const btcWeek = EXTERNAL_ANALYST_VIEWPOINTS_20260830.find((card) => card.id === "captain-btc-week-20260830");
  const ethWeek = EXTERNAL_ANALYST_VIEWPOINTS_20260830.find((card) => card.id === "captain-eth-week-20260830");
  const btcMonth = EXTERNAL_ANALYST_VIEWPOINTS_20260830.find((card) => card.id === "captain-btc-month-20260830");
  assert.deepEqual(btcWeek?.supports, [75500, 72000]);
  assert.deepEqual(ethWeek?.supports, [2355]);
  assert.deepEqual(btcMonth?.resistances, [90000, 92000]);
  assert.match(btcWeek?.invalidation ?? "", /72,000/);
  assert.match(ethWeek?.invalidation ?? "", /2,355/);
});

test("admin viewer combines both batches without trading wiring", () => {
  const page = readFileSync(resolve(process.cwd(), "app/admin/external-viewpoints/page.tsx"), "utf8");
  const cards = readFileSync(resolve(process.cwd(), "lib/data/external-analyst-viewpoints-20260830.ts"), "utf8");
  assert.match(page, /EXTERNAL_ANALYST_VIEWPOINTS_20260828, \.\.\.EXTERNAL_ANALYST_VIEWPOINTS_20260830/);
  assert.match(page, /发布时间未核验/);
  assert.doesNotMatch(page, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
  assert.doesNotMatch(cards, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
});
