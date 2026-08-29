import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { EXTERNAL_ANALYST_VIEWPOINTS_20260828 } from "../lib/data/external-analyst-viewpoints-20260828";
import {
  ANALYST_FUSION_SHADOW_VARIANTS,
  determineShadowPromotion,
  evaluateShadowVariant,
  type ShadowVariantSample,
} from "../lib/research/analyst-fusion-shadow-core";
import { EXTERNAL_ANALYST_ROLE_REGISTRY } from "../lib/research/external-analyst-role-registry";
import {
  assessExternalViewpointCard,
  findDuplicateExternalViewpoints,
  type ExternalViewpointCard,
} from "../lib/research/external-viewpoint-card-core";

test("external analyst roles never own formal direction or standalone trading authority", () => {
  assert.equal(EXTERNAL_ANALYST_ROLE_REGISTRY.length, 4);
  for (const source of EXTERNAL_ANALYST_ROLE_REGISTRY) {
    assert.equal(source.ownsFormalDirection, false);
    assert.equal(source.canTriggerTradeAlone, false);
    assert.equal(source.automaticConsensus, false);
    assert.equal(source.validationState, "PROSPECTIVE_ONLY");
  }
});

test("2026-08-28 material starts in a genuinely future window and remains research only", () => {
  assert.equal(findDuplicateExternalViewpoints(EXTERNAL_ANALYST_VIEWPOINTS_20260828).length, 0);
  const assessed = EXTERNAL_ANALYST_VIEWPOINTS_20260828.map((card) => ({ card, result: assessExternalViewpointCard(card) }));
  assert.ok(assessed.every(({ result }) => result.accepted));
  assert.equal(assessed.filter(({ result }) => result.forwardScoreEligible).length, 7);
  assert.equal(assessed.filter(({ card }) => card.status === "NOTE_ONLY").length, 2);
  for (const { card, result } of assessed) {
    assert.ok(Date.parse(card.sourcePublishedAt) < Date.parse(`${card.applicableStart}T00:00:00.000Z`));
    assert.ok(Date.parse(card.ingestedAt) < Date.parse(`${card.applicableStart}T00:00:00.000Z`));
    assert.equal(card.consensusEligible, false);
    assert.equal(result.authority, "RESEARCH_ONLY");
    assert.equal(result.tradingEligible, false);
  }
});

test("technical cards fail closed without confirmation and invalidation", () => {
  const base = EXTERNAL_ANALYST_VIEWPOINTS_20260828.find((card) => card.role === "TECHNICAL_LEVELS");
  assert.ok(base);
  const broken: ExternalViewpointCard = { ...base, confirmation: "", invalidation: "" };
  const result = assessExternalViewpointCard(broken);
  assert.equal(result.accepted, false);
  assert.equal(result.forwardScoreEligible, false);
  assert.ok(result.reasons.includes("TECHNICAL_CONDITIONS_REQUIRED"));
});

test("same source asset horizon and period is deduplicated even when wording changes", () => {
  const base = EXTERNAL_ANALYST_VIEWPOINTS_20260828[0];
  assert.ok(base);
  assert.deepEqual(findDuplicateExternalViewpoints([base, { ...base, id: `${base.id}-copy`, thesis: "改写文字" }]), [
    `${base.sourceId}:${base.symbol}:${base.horizon}:${base.applicableStart}:${base.applicableEnd}`,
  ]);
});

function samples(count: number, variant: ShadowVariantSample["variant"], misses: number, adverse: number, regimes = 1) {
  return Array.from({ length: count }, (_, index): ShadowVariantSample => ({
    id: `${variant}-${index}`,
    variant,
    market: "US",
    horizon: "WEEK",
    regime: index % regimes === 0 ? "RISK_ON" : "RISK_OFF",
    lockedAt: "2026-08-30T00:00:00.000Z",
    applicableStart: "2026-08-31",
    result: index < misses ? "MISS" : "FULL_HIT",
    adverseExcursionPct: adverse,
  }));
}

test("shadow promotion requires sample, improvement, adverse excursion and regime gates", () => {
  const baseline = evaluateShadowVariant(samples(30, "METAPHYSICS_PRIMARY", 12, 5, 2));
  const tooFew = evaluateShadowVariant(samples(9, "WITH_EXTERNAL_CONDITIONS", 0, 3, 2));
  assert.equal(determineShadowPromotion({ candidate: tooFew, baseline }).state, "OBSERVE_ONLY");

  const riskOnly = evaluateShadowVariant(samples(15, "WITH_EXTERNAL_CONDITIONS", 2, 3, 2));
  assert.equal(determineShadowPromotion({ candidate: riskOnly, baseline }).state, "RISK_ONLY");

  const confirmation = evaluateShadowVariant(samples(20, "WITH_EXTERNAL_CONDITIONS", 4, 3, 2));
  assert.equal(determineShadowPromotion({ candidate: confirmation, baseline }).state, "CONFIRMATION_CANDIDATE");

  const review = evaluateShadowVariant(samples(30, "WITH_EXTERNAL_AND_CHAN", 6, 3, 2));
  assert.equal(determineShadowPromotion({ candidate: review, baseline }).state, "WEIGHT_REVIEW_CANDIDATE");

  const worseAdverse = evaluateShadowVariant(samples(30, "WITH_EXTERNAL_AND_CHAN", 0, 8, 2));
  assert.equal(determineShadowPromotion({ candidate: worseAdverse, baseline }).state, "KEEP_SHADOW");
});

test("admin display is read only and does not wire research cards into trading modules", () => {
  const page = readFileSync(resolve(process.cwd(), "app/admin/external-viewpoints/page.tsx"), "utf8");
  const cards = readFileSync(resolve(process.cwd(), "lib/data/external-analyst-viewpoints-20260828.ts"), "utf8");
  assert.match(page, /四组影子对照/);
  assert.match(page, /不单独下单/);
  assert.doesNotMatch(page, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
  assert.doesNotMatch(cards, /lib\/trading-signals|lib\/bitget|submitOrder|createOrder/);
  assert.ok(ANALYST_FUSION_SHADOW_VARIANTS.every((variant) => !variant.tradingEligible));
});
