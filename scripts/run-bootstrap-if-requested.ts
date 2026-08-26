/**
 * Runs safe bootstrap / seed during Vercel build.
 * NEVER runs destructive payment/membership wipes on production deploys.
 */
import { execSync } from "child_process";

const onVercel = process.env.VERCEL === "1";
const shouldRun = process.env.RUN_ADMIN_BOOTSTRAP === "true" || onVercel;
const allowContentMaintenance =
  process.env.RUN_BOOTSTRAP_CONTENT_MAINTENANCE === "true" && !onVercel;
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
  if (onVercel) {
    console.log(
      "[bootstrap] skipped legacy Supabase SQL replay (Vercel uses its separate Prisma migration step)",
    );
  } else {
    runStep("apply-migrations", "npx tsx scripts/apply-migrations.ts", false);
  }
  if (allowContentMaintenance) {
    console.warn("[bootstrap] explicit non-Vercel content maintenance enabled");
    runStep("seed-daily-forecasts", "npx tsx scripts/seed-daily-forecasts.ts", false);
    runStep("verify-review", "npx tsx scripts/run-verify-review-once.ts", false);
    runStep("fix-hstech-index", "npx tsx scripts/fix-hstech-index-quotes.ts", false);
  } else {
    console.log(
      "[bootstrap] skipped forecast generation, verification and quote repair (independent cron/manual jobs only)",
    );
  }
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
  const allowPaymentEmailTest =
    process.env.RUN_PAYMENT_EMAIL_TEST === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production";
  if (allowPaymentEmailTest) {
    runStep("payment-email-test", "npx tsx scripts/send-payment-test-email.ts", false);
  } else {
    console.log("[bootstrap] skipped payment-email-test (explicit non-production opt-in required)");
  }
} else {
  console.log("[bootstrap] skipped");
}
