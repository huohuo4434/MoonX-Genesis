import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPasswordResetCallbackUrl,
  normalizePasswordResetEmail,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateNewPassword,
} from "../lib/auth/password-reset-core.ts";

const root = resolve(process.cwd());
const source = (relative: string) => readFileSync(resolve(root, relative), "utf8");

describe("password reset core", () => {
  test("normalizes email and uses a fixed on-site callback", () => {
    assert.equal(normalizePasswordResetEmail("  Member@Example.COM "), "member@example.com");
    assert.equal(
      buildPasswordResetCallbackUrl("https://mooxintel.com"),
      "https://mooxintel.com/auth/callback?next=%2Freset-password"
    );
  });

  test("validates password length and confirmation", () => {
    assert.match(validateNewPassword("short", "short") ?? "", /至少/);
    assert.match(validateNewPassword("new-password", "different-password") ?? "", /不一致/);
    assert.equal(validateNewPassword("new-password", "new-password"), null);
  });
});

describe("password reset security boundaries", () => {
  test("request API preserves account-enumeration privacy and rate limits both identities", () => {
    const route = source("app/api/public/auth/forgot-password/route.ts");
    assert.match(route, /resetPasswordForEmail/);
    assert.match(route, /forgot-password:ip/);
    assert.match(route, /forgot-password:email/);
    assert.match(route, /identityHash/);
    assert.match(route, /PASSWORD_RESET_GENERIC_MESSAGE/);
    assert.doesNotMatch(PASSWORD_RESET_GENERIC_MESSAGE, /registered|exists|不存在|存在/);
    assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE_KEY|getAdminClient/);
  });

  test("completion requires a recovery session, updates through Supabase, and revokes other access", () => {
    const route = source("app/api/auth/reset-password/route.ts");
    assert.match(route, /supabase\.auth\.getUser/);
    assert.match(route, /supabase\.auth\.updateUser/);
    assert.match(route, /logoutOtherDevices/);
    assert.match(route, /PASSWORD_RESET_COMPLETED/);
    assert.match(route, /scope:\s*"global"/);
    assert.match(route, /MEMBER_DEVICE_COOKIE/);
  });

  test("recovery callbacks always reach reset page, including admin accounts", () => {
    const callback = source("app/auth/callback/route.ts");
    assert.match(callback, /passwordRecovery/);
    assert.match(callback, /type === "recovery"/);
    assert.match(callback, /if \(passwordRecovery\)/);
    assert.match(callback, /redirect\(`\$\{origin\}\/reset-password`\)/);
    assert.match(callback, /forgot-password\?error=expired/);
  });

  test("login and reset forms expose the expected safe user flow", () => {
    const login = source("components/auth/LoginForm.tsx");
    const reset = source("components/auth/ResetPasswordForm.tsx");
    assert.match(login, /href\("\/forgot-password"\)/);
    assert.match(login, /password_reset/);
    assert.match(reset, /autoComplete="new-password"/);
    assert.match(reset, /validateNewPassword/);
    assert.doesNotMatch(reset, /localStorage|service_role|access_token|refresh_token/);
  });
});
