import assert from "node:assert/strict";
import test from "node:test";
import {
  REFERRAL_REWARD_DAYS,
  ensureReferralInvite,
  bindReferralOnRegister,
  finalizeReferralReward,
  normalizeInviteCode,
  recordDeviceRegistration,
  __resetReferralMemoryForTests,
} from "../lib/referral/store";

function resetStore() {
  process.env.MOONX_REFERRAL_LOCAL_ONLY = "1";
  __resetReferralMemoryForTests();
}

test("normalize invite code", () => {
  assert.equal(normalizeInviteCode(" abc-123 "), "ABC123");
});

test("referral bind + single payment reward", async () => {
  resetStore();
  const invite = await ensureReferralInvite("inviter-1", "ABC123");
  assert.equal(invite.invite_code, "ABC123");

  const self = await bindReferralOnRegister({
    inviterId: "inviter-1",
    inviteeId: "inviter-1",
    inviteeEmail: "a@test.com",
  });
  assert.equal(self.ok, false);

  const bound = await bindReferralOnRegister({
    inviterId: "inviter-1",
    inviteeId: "invitee-1",
    inviteeEmail: "b@test.com",
    inviterEmail: "a@test.com",
    deviceId: "device-ok-001",
  });
  assert.equal(bound.ok, true);
  assert.equal(bound.record?.status, "pending");
  assert.equal(bound.record?.reward_days, REFERRAL_REWARD_DAYS);

  const first = await finalizeReferralReward({ inviteeId: "invitee-1", paymentId: "pay-1" });
  assert.equal(first.applied, true);
  assert.equal(first.record?.status, "success");

  const second = await finalizeReferralReward({ inviteeId: "invitee-1", paymentId: "pay-1" });
  assert.equal(second.applied, false);

  const otherPay = await finalizeReferralReward({ inviteeId: "invitee-1", paymentId: "pay-2" });
  assert.equal(otherPay.applied, false);
});

test("device burst flags registration", async () => {
  resetStore();
  await ensureReferralInvite("inviter-2", "XYZ789");
  const device = "device-burst-9999";
  for (let i = 0; i < 3; i += 1) {
    const r = await recordDeviceRegistration(device, `u-${i}`);
    assert.equal(r.flagged, false);
  }
  const flagged = await recordDeviceRegistration(device, "u-3");
  assert.equal(flagged.flagged, true);

  const bound = await bindReferralOnRegister({
    inviterId: "inviter-2",
    inviteeId: "invitee-burst",
    inviteeEmail: "burst@test.com",
    deviceId: device,
  });
  assert.equal(bound.ok, true);
  assert.equal(bound.record?.status, "flagged");

  const reward = await finalizeReferralReward({
    inviteeId: "invitee-burst",
    paymentId: "pay-burst",
  });
  assert.equal(reward.applied, false);
});
