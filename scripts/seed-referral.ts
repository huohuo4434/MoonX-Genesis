/**
 * Seed referral demo data into local/JSON store.
 * Creates invite ABC123 and one pending referral record.
 */
import { loadProductionEnv } from "./load-env";
import { seedReferralDemo } from "../lib/referral/store";

loadProductionEnv();

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("Production seed is disabled");
  }

  // Deterministic demo UUIDs (not real auth users) for UI / admin listing tests.
  const inviterId = "00000000-0000-4000-8000-000000000001";
  const inviteeId = "00000000-0000-4000-8000-000000000002";
  const result = await seedReferralDemo({
    inviterId,
    inviterEmail: "inviter-demo@moonx.test",
    inviteeId,
    inviteeEmail: "invitee-demo@moonx.test",
    code: "ABC123",
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        inviteCode: result.invite.invite_code,
        recordId: result.record.id,
        status: result.record.status,
        message: "Referral demo seed completed",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
