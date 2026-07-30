/**
 * Backfill unique referral codes for all active members / admins.
 * Never overwrites an existing invite code.
 *
 * Usage: npx tsx scripts/backfill-referral-codes.ts
 */
import { loadProductionEnv } from "./load-env";
import { backfillReferralCodesForActiveMembers } from "../lib/referral/service";

loadProductionEnv();

async function main() {
  const result = await backfillReferralCodesForActiveMembers();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});
