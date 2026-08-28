import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyLoginAuthError, safeLoginAuthErrorMeta } from "../lib/auth/login-error.ts";

const root = resolve(process.cwd());

describe("login provider failure classification", () => {
  test("keeps credential and confirmation failures on the existing safe flow", () => {
    assert.deepEqual(classifyLoginAuthError({ message: "Invalid login credentials", status: 400 }), {
      status: 401,
      error: "Invalid login credentials",
      code: "INVALID_CREDENTIALS",
    });
    assert.equal(classifyLoginAuthError({ message: "Email not confirmed" }).code, "EMAIL_NOT_CONFIRMED");
  });

  test("does not mislabel opaque provider failures as a bad password", () => {
    assert.deepEqual(classifyLoginAuthError({ message: "{}", status: 0, name: "AuthRetryableFetchError" }), {
      status: 503,
      error: "登录服务繁忙，请稍后再试",
      code: "AUTH_PROVIDER_UNAVAILABLE",
    });
    assert.equal(classifyLoginAuthError(new Error("upstream unavailable")).status, 503);
  });

  test("logs only bounded provider metadata", () => {
    const meta = safeLoginAuthErrorMeta({
      name: "AuthRetryableFetchError",
      status: 0,
      code: "unexpected_failure",
      message: "{}",
      password: "must-not-leak",
    });
    assert.deepEqual(meta, {
      name: "AuthRetryableFetchError",
      code: "unexpected_failure",
      status: 0,
    });
  });
});

describe("login route resilience wiring", () => {
  test("returns provider failures as retryable service errors", () => {
    const route = readFileSync(resolve(root, "app/api/auth/login/route.ts"), "utf8");
    assert.match(route, /classifyLoginAuthError/);
    assert.match(route, /safeLoginAuthErrorMeta/);
    assert.match(route, /provider request failed/);
    assert.doesNotMatch(route, /error\?\.message \?\? "Invalid login credentials"/);
  });
});
