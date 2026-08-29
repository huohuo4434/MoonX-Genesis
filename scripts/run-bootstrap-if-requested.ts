/**
 * Explicit maintenance runner. It is never enabled merely because Vercel is
 * building the application. Every state-changing operation must be requested
 * by its own environment flag.
 */
import { execSync } from "child_process";

const onVercel = process.env.VERCEL === "1";
const shouldRun = process.env.RUN_ADMIN_BOOTSTRAP === "true";
const allowDestructive =
  process.env.ALLOW_DESTRUCTIVE_PAYMENT_CLEANUP === "true" &&
  process.env.VERCEL_ENV !== "production" &&
  process.env.NODE_ENV !== "production";

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
  console.log("[bootstrap] safe init (membership-preserving)");
  if (process.env.RUN_ADMIN_BOOTSTRAP === "true") {
    runStep("bootstrap-admin", "npx tsx scripts/bootstrap-admin.ts", true);
  }
  runStep("confirm-existing-users", "npx tsx scripts/confirm-existing-users.ts", false);
  runStep("apply-migrations", "npx tsx scripts/apply-migrations.ts", false);
  runStep("seed-daily-forecasts", "npx tsx scripts/seed-daily-forecasts.ts", false);
  runStep("verify-review", "npx tsx scripts/run-verify-review-once.ts", false);
  runStep("fix-hstech-index", "npx tsx scripts/fix-hstech-index-quotes.ts", false);
  runStep("membership-deploy-guard", "npx tsx scripts/membership-deploy-guard.ts", false);

  // Destructive payment/membership wipes are FORBIDDEN on production.
  if (allowDestructive) {
    console.warn("[bootstrap] ALLOW_DESTRUCTIVE_PAYMENT_CLEANUP enabled — non-production only");
    runStep("cleanup-payment-history", "npx tsx scripts/cleanup-payment-history.ts", false);
    runStep("wipe-payment-orders-final", "npx tsx scripts/wipe-payment-orders.ts", false);
  } else {
    console.log(
      "[bootstrap] skipped cleanup-payment-history + wipe-payment-orders (protects memberships)"
    );
  }

  if (process.env.RUN_ADMIN_BOOTSTRAP === "true" && process.env.RUN_SMOKE_AUTH === "true" && allowDestructive) {
    runStep("smoke-auth", "npx tsx scripts/smoke-auth.ts", false);
  }
  if (process.env.RUN_PAYMENT_EMAIL_TEST === "true") {
    runStep("payment-email-test", "npx tsx scripts/send-payment-test-email.ts", false);
  } else {
    console.log("[bootstrap] skipped payment-email-test (requires RUN_PAYMENT_EMAIL_TEST=true)");
  }
} else {
  console.log("[bootstrap] skipped");
}
