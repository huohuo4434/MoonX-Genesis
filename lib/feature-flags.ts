import "server-only";

/**
 * Central feature flags — read env once on the server.
 * Client components receive flags via props from server parents.
 */
export interface FeatureFlags {
  publicSignupEnabled: boolean;
  paymentsEnabled: boolean;
  memberForecastEnabled: boolean;
  adminEnabled: boolean;
  intelligenceSnapshotEnabled: boolean;
  bep20PaymentsEnabled: boolean;
  autoForecastEnabled: boolean;
  autoVerifyEnabled: boolean;
  autoReviewEnabled: boolean;
  autoLearningEnabled: boolean;
  autoPublishEnabled: boolean;
}

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

export function getFeatureFlags(): FeatureFlags {
  return {
    publicSignupEnabled: envBool("PUBLIC_SIGNUP_ENABLED", true),
    paymentsEnabled: envBool("PAYMENTS_ENABLED", true),
    memberForecastEnabled: envBool("MEMBER_FORECAST_ENABLED", true),
    adminEnabled: envBool("ADMIN_ENABLED", true),
    intelligenceSnapshotEnabled: envBool("INTELLIGENCE_SNAPSHOT_ENABLED", false),
    bep20PaymentsEnabled: envBool("BEP20_PAYMENTS_ENABLED", false),
    autoForecastEnabled: envBool("AUTO_FORECAST_ENABLED", true),
    autoVerifyEnabled: envBool("AUTO_VERIFY_ENABLED", true),
    autoReviewEnabled: envBool("AUTO_REVIEW_ENABLED", true),
    autoLearningEnabled: envBool("AUTO_LEARNING_ENABLED", true),
    autoPublishEnabled: envBool("AUTO_PUBLISH_ENABLED", true),
  };
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)
  );
}

/** Lists missing auth env var names for logs/UI — never includes values. */
export function getMissingAuthEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

export function getAuthMaintenanceMessage(): string | undefined {
  if (isSupabaseAuthConfigured()) return undefined;
  const missing = getMissingAuthEnvVars();
  if (missing.length) {
    console.warn("[auth] missing env:", missing.join(", "));
    return `登录功能正在维护，缺少配置：${missing.join("、")}`;
  }
  return "登录功能正在维护，请稍后再试。";
}
