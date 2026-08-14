import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REFERRAL_INVITEE_REWARD_DAYS,
  REFERRAL_INVITER_REWARD_DAYS,
  fixedMembershipExpiry,
  referralRewardDaysFor,
  runReferralRewardDelivery,
  type FixedMembershipRewardPlan,
  type ReferralRewardDeliveryPlan,
} from "../lib/referral/reward-policy";
import {
  REFERRAL_REWARD_RECOVERY_MS,
  __resetReferralMemoryForTests,
  bindReferralOnRegister,
  claimReferralRewardDelivery,
  completeReferralRewardDelivery,
  finalizeReferralReward,
  persistReferralRewardDeliveryPlan,
} from "../lib/referral/store";

function resetReferralStore() {
  process.env.MOONX_REFERRAL_LOCAL_ONLY = "1";
  __resetReferralMemoryForTests();
}

async function bind(inviteeId: string) {
  const bound = await bindReferralOnRegister({
    inviterId: "inviter",
    inviteeId,
    inviteeEmail: `${inviteeId}@test.local`,
    inviterEmail: "inviter@test.local",
  });
  assert.equal(bound.ok, true);
  return bound.record!;
}

function plan(): ReferralRewardDeliveryPlan {
  return {
    inviter: {
      userId: "inviter",
      days: 30,
      previousExpiresAt: "2026-08-20T00:00:00.000Z",
      targetExpiresAt: "2026-09-19T00:00:00.000Z",
    },
    invitee: {
      userId: "invitee-recovery",
      days: 7,
      previousExpiresAt: null,
      targetExpiresAt: "2026-08-22T00:00:00.000Z",
    },
  };
}

test("referral policy grants inviter 30 days and invitee 7 days", () => {
  assert.equal(REFERRAL_INVITER_REWARD_DAYS, 30);
  assert.equal(REFERRAL_INVITEE_REWARD_DAYS, 7);
  assert.equal(referralRewardDaysFor("INVITER"), 30);
  assert.equal(referralRewardDaysFor("INVITEE"), 7);
});

test("fixed expiry retries never add the reward twice", () => {
  const target = "2026-09-19T00:00:00.000Z";
  assert.equal(fixedMembershipExpiry(null, target), target);
  assert.equal(fixedMembershipExpiry(target, target), target);
  assert.equal(
    fixedMembershipExpiry("2026-10-01T00:00:00.000Z", target),
    "2026-10-01T00:00:00.000Z",
  );
  assert.throws(() => fixedMembershipExpiry(null, "not-a-date"), /TARGET_INVALID/);
});

test("persisted absolute plan survives auth-write/event failure and owner takeover exactly once", async () => {
  resetReferralStore();
  await bind("invitee-recovery");
  const started = new Date("2026-08-15T00:00:00.000Z");
  const fixedPlan = plan();
  const expiries = new Map<string, string | null>([
    ["inviter", fixedPlan.inviter.previousExpiresAt],
    ["invitee-recovery", fixedPlan.invitee.previousExpiresAt],
  ]);
  const eventSources = new Set<string>();
  let failInviterEventOnce = true;

  const apply = async (input: {
    plan: FixedMembershipRewardPlan;
    sourceId: string;
    note: string;
  }) => {
    if (eventSources.has(input.sourceId)) return { applied: false, newExpiresAt: expiries.get(input.plan.userId) };
    assert.ok(input.plan.targetExpiresAt);
    const next = fixedMembershipExpiry(
      expiries.get(input.plan.userId) ?? null,
      input.plan.targetExpiresAt!,
    );
    expiries.set(input.plan.userId, next);
    if (input.plan.userId === "inviter" && failInviterEventOnce) {
      failInviterEventOnce = false;
      throw new Error("SIMULATED_EVENT_FAILURE_AFTER_AUTH_WRITE");
    }
    eventSources.add(input.sourceId);
    return { applied: true, newExpiresAt: next };
  };

  await assert.rejects(
    () => runReferralRewardDelivery({
      inviterId: "inviter",
      inviteeId: "invitee-recovery",
      paymentId: "payment-recovery",
      ownerToken: "owner-first",
      claim: (ownerToken) => claimReferralRewardDelivery({
        inviteeId: "invitee-recovery",
        paymentId: "payment-recovery",
        ownerToken,
        now: started,
      }),
      prepare: async () => fixedPlan,
      persistPlan: (recordId, ownerToken, rewardPlan) =>
        persistReferralRewardDeliveryPlan({ recordId, ownerToken, plan: rewardPlan }),
      apply,
      complete: (recordId, ownerToken) => completeReferralRewardDelivery({ recordId, ownerToken }),
    }),
    /SIMULATED_EVENT_FAILURE_AFTER_AUTH_WRITE/,
  );
  assert.equal(expiries.get("inviter"), fixedPlan.inviter.targetExpiresAt);

  let concurrentApplies = 0;
  const concurrent = await runReferralRewardDelivery({
    inviterId: "inviter",
    inviteeId: "invitee-recovery",
    paymentId: "payment-recovery",
    ownerToken: "owner-concurrent",
    claim: (ownerToken) => claimReferralRewardDelivery({
      inviteeId: "invitee-recovery",
      paymentId: "payment-recovery",
      ownerToken,
      now: new Date(started.getTime() + 1_000),
    }),
    prepare: async () => { throw new Error("persisted plan must be reused"); },
    persistPlan: async () => { throw new Error("persisted plan must not be replaced"); },
    apply: async () => { concurrentApplies += 1; return { applied: true }; },
    complete: (recordId, ownerToken) => completeReferralRewardDelivery({ recordId, ownerToken }),
  });
  assert.equal(concurrent.applied, false);
  assert.equal(concurrentApplies, 0);

  const recovery = await runReferralRewardDelivery({
    inviterId: "inviter",
    inviteeId: "invitee-recovery",
    paymentId: "payment-recovery",
    ownerToken: "owner-recovery",
    claim: (ownerToken) => claimReferralRewardDelivery({
      inviteeId: "invitee-recovery",
      paymentId: "payment-recovery",
      ownerToken,
      now: new Date(started.getTime() + REFERRAL_REWARD_RECOVERY_MS + 1),
    }),
    prepare: async () => { throw new Error("persisted plan must be reused"); },
    persistPlan: async () => { throw new Error("persisted plan must not be replaced"); },
    apply,
    complete: (recordId, ownerToken) => completeReferralRewardDelivery({ recordId, ownerToken }),
  });
  assert.equal(recovery.applied, true);
  assert.equal(recovery.record.status, "success");
  assert.equal(expiries.get("inviter"), fixedPlan.inviter.targetExpiresAt);
  assert.equal(expiries.get("invitee-recovery"), fixedPlan.invitee.targetExpiresAt);
  assert.equal(eventSources.size, 2);

  // A stale owner resuming after takeover can only re-apply the same targets and cannot complete.
  await apply({
    plan: fixedPlan.inviter,
    sourceId: "referral_inviter_stale-retry",
    note: "stale owner",
  });
  assert.equal(expiries.get("inviter"), fixedPlan.inviter.targetExpiresAt);
  await assert.rejects(
    () => completeReferralRewardDelivery({ recordId: recovery.record.id, ownerToken: "owner-first" }),
    /OWNER_MISMATCH|NOT_IN_PROGRESS/,
  );
});

test("historical success is never replayed under the new policy", async () => {
  resetReferralStore();
  const record = await bind("invitee-history");
  const historical = await finalizeReferralReward({ inviteeId: "invitee-history", paymentId: "old-payment" });
  assert.equal(historical.record?.status, "success");
  record.reward_days = 7;
  let prepareCalls = 0;
  let applyCalls = 0;
  const result = await runReferralRewardDelivery({
    inviterId: "inviter",
    inviteeId: "invitee-history",
    paymentId: "old-payment",
    ownerToken: "owner-history",
    claim: (ownerToken) => claimReferralRewardDelivery({
      inviteeId: "invitee-history",
      paymentId: "old-payment",
      ownerToken,
    }),
    prepare: async () => { prepareCalls += 1; return plan(); },
    persistPlan: (recordId, ownerToken, rewardPlan) =>
      persistReferralRewardDeliveryPlan({ recordId, ownerToken, plan: rewardPlan }),
    apply: async () => { applyCalls += 1; return { applied: true }; },
    complete: (recordId, ownerToken) => completeReferralRewardDelivery({ recordId, ownerToken }),
  });
  assert.equal(result.applied, false);
  assert.equal(prepareCalls, 0);
  assert.equal(applyCalls, 0);
  assert.equal(result.record?.reward_days, 7);
});

test("production service uses persisted fixed targets and owner-fenced completion", () => {
  const service = fs.readFileSync(path.join(process.cwd(), "lib/referral/service.ts"), "utf8");
  assert.match(service, /runReferralRewardDelivery/);
  assert.match(service, /prepareFixedMembershipRewardPlan/);
  assert.match(service, /persistReferralRewardDeliveryPlan/);
  assert.match(service, /applyFixedMembershipRewardPlan/);
  assert.match(service, /completeReferralRewardDelivery/);
});

test("public and admin copy describe the asymmetric reward", () => {
  const copy = [
    "app/account/invite/page.tsx",
    "app/account/membership/page.tsx",
    "app/admin/referrals/page.tsx",
    "messages/zh-CN.json",
    "messages/en.json",
  ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
  assert.match(copy, /邀请人获赠 30 天/);
  assert.match(copy, /被邀请人获赠 7 天/);
  assert.match(copy, /inviter receives 30 days/);
  assert.match(copy, /invitee receives 7 days/);
  assert.doesNotMatch(copy, /双方各赠送 7 天|Both of you receive 7/);
});
