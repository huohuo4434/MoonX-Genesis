/**
 * Runs bootstrap / seed / verify during Vercel build.
 * Never fail the production deploy solely because market data fetch flaked.
 */
import { execSync } from "child_process";

const onVercel = process.env.VERCEL === "1";
const shouldRun = process.env.RUN_ADMIN_BOOTSTRAP === "true" || onVercel;

function runStep(label: string, cmd: string, required: boolean) {
  console.log(`[bootstrap] ${label}`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(`[bootstrap] ${label} failed:`, err instanceof Error ? err.message : String(err));
    if (required && !onVercel) process.exit(1);
  }
}

if (shouldRun) {
  console.log("[bootstrap] init store + seed + verify");
  if (process.env.RUN_ADMIN_BOOTSTRAP === "true") {
    runStep("bootstrap-admin", "npx tsx scripts/bootstrap-admin.ts", true);
  }
  // Always confirm existing unconfirmed users on production builds.
  runStep("confirm-existing-users", "npx tsx scripts/confirm-existing-users.ts", false);
  runStep("apply-migrations", "npx tsx scripts/apply-migrations.ts", false);
  runStep("seed-daily-forecasts", "npx tsx scripts/seed-daily-forecasts.ts", true);
  // Re-seed VOID rows first, then verify so HSTECH index quotes are not overwritten.
  runStep("seed-void-heal", "npx tsx scripts/seed-daily-forecasts.ts", false);
  runStep("verify-review", "npx tsx scripts/run-verify-review-once.ts", false);
  // Final HSTECH index re-verify after any seed merges.
  runStep("verify-review-final", "npx tsx scripts/run-verify-review-once.ts", false);
  runStep("fix-hstech-index", "npx tsx scripts/fix-hstech-index-quotes.ts", false);
  // Skip smoke-auth payment seeding on production builds — it races with payment cleanup
  // and re-writes historical test orders into Storage.
  if (process.env.RUN_ADMIN_BOOTSTRAP === "true" && process.env.RUN_SMOKE_AUTH === "true") {
    runStep("smoke-auth", "npx tsx scripts/smoke-auth.ts", false);
  }
  runStep("cleanup-payment-history", "npx tsx scripts/cleanup-payment-history.ts", false);
  // Final hard wipe after any concurrent API writes from previous alias.
  runStep("wipe-payment-orders-final", "npx tsx scripts/wipe-payment-orders.ts", true);
  runStep("payment-email-test", "npx tsx scripts/send-payment-test-email.ts", false);
} else {
  console.log("[bootstrap] skipped");
}
