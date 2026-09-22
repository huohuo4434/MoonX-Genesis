import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { checkRateLimit } from "../lib/auth/rate-limit";

const limiterSource = readFileSync(new URL("../lib/auth/member-api-rate-limit.ts", import.meta.url), "utf8");

function loadLimiter() {
  let reads = 0;
  let cookie = "device-a";
  const calls: unknown[][] = [];
  const output = { exports: {} as { checkMemberApiRateLimit: (input: { scope: string; limit?: number; windowMs?: number }, access?: { userId: string | null }) => Promise<{ ok: boolean }> } };
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    "@/lib/auth/rate-limit": { checkRateLimit: (...args: [string, number, number]) => { calls.push(args); return checkRateLimit(...args); } },
    "@/lib/auth/get-access-user": { getAccessUser: async () => { reads++; return { userId: "fresh-user" }; } },
    "@/lib/auth/device-security": { MEMBER_DEVICE_COOKIE: "member-device", hashDeviceToken: (token: string) => `hashed-${token}` },
  };
  runInNewContext(ts.transpileModule(limiterSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: output.exports,
    require: (name: string) => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]; },
  });
  return { check: output.exports.checkMemberApiRateLimit, calls, reads: () => reads, setCookie: (value: string) => { cookie = value; } };
}

test("verified request identity avoids a duplicate lookup, without changing rate budgets", async () => {
  const limiter = loadLimiter();
  const input = { scope: "reuse-test", limit: 1, windowMs: 60_000 };
  assert.equal((await limiter.check(input, { userId: "verified-user" })).ok, true);
  assert.equal((await limiter.check(input, { userId: "verified-user" })).ok, false);
  assert.equal(limiter.reads(), 0);
  assert.equal(limiter.calls[0][0], "member-api:reuse-test:verified-user:hashed-device-a");
  assert.equal(limiter.calls[0][1], 1);
  assert.equal(limiter.calls[0][2], 60_000);
  assert.equal((await limiter.check(input, { userId: "other-user" })).ok, true);
  limiter.setCookie("device-b");
  assert.equal((await limiter.check(input, { userId: "verified-user" })).ok, true);
});

test("callers without a verified identity retain fresh lookup and defaults", async () => {
  const limiter = loadLimiter();
  await limiter.check({ scope: "default-test" });
  await limiter.check({ scope: "default-test" });
  assert.equal(limiter.reads(), 2);
  assert.equal(limiter.calls[0][0], "member-api:default-test:fresh-user:hashed-device-a");
  assert.equal(limiter.calls[0][1], 120);
  assert.equal(limiter.calls[0][2], 60_000);
  limiter.setCookie("");
  await limiter.check({ scope: "default-test" }, { userId: null });
  assert.equal(limiter.calls[2][0], "member-api:default-test:anonymous:missing");
});

test("desk route reuses only its allowed gate, stays private and hides provider errors", () => {
  const route = readFileSync(new URL("../app/api/member/ai-trading-desk/route.ts", import.meta.url), "utf8");
  assert.match(route, /const gate = await requireMemberDeviceAccess\(\)/);
  assert.match(route, /if \(gate.status !== "ALLOWED"\)[\s\S]*?status: gate.status === "LOGIN_REQUIRED" \? 401 : 403/);
  assert.ok(route.indexOf('status: gate.status') < route.indexOf('const rate ='));
  assert.match(route, /checkMemberApiRateLimit\(\{ scope: "ai-trading-desk" \}, gate.access\)/);
  assert.match(route, /if \(!rate.ok\) return NextResponse.json\([\s\S]*?status: 429/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /"X-MOOX-Desk-Mode": "snapshot-only"/);
  assert.doesNotMatch(route, /error\.message|error\.stack|runTrading|runPrediction/);
});

test("desk handler denies unauthorized requests before limiter or snapshot and reuses the exact allowed access", async () => {
  const source = readFileSync(new URL("../app/api/member/ai-trading-desk/route.ts", import.meta.url), "utf8");
  const access = { userId: "server-verified" };
  let status = "LOGIN_REQUIRED";
  let limited = false;
  let fail = false;
  let rateCalls = 0;
  let snapshotCalls = 0;
  const output = { exports: {} as { GET: () => Promise<{ body: unknown; status: number; headers: Record<string, string> }> } };
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) => ({ body, status: options.status ?? 200, headers: options.headers ?? {} }) } },
    "@/lib/auth/member-device-guard": { getMemberDevicePageAccess: async () => ({ status, access, device: null }) },
    "@/lib/auth/member-api-rate-limit": { checkMemberApiRateLimit: async (_: unknown, actual: unknown) => { rateCalls++; assert.equal(actual, access); return { ok: !limited }; } },
    "@/lib/trading-signals/member-ai-trading-desk-cache": { getCachedMemberAiTradingDeskSnapshot: async () => { snapshotCalls++; if (fail) throw new Error("private-database-password"); return { snapshot: true }; } },
  };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: output.exports,
    require: (name: string) => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]; },
  });
  assert.equal((await output.exports.GET()).status, 401);
  for (status of ["MEMBERSHIP_REQUIRED", "DEVICE_REQUIRED"]) assert.equal((await output.exports.GET()).status, 403);
  assert.equal(rateCalls, 0);
  assert.equal(snapshotCalls, 0);
  status = "ALLOWED";
  limited = true;
  assert.equal((await output.exports.GET()).status, 429);
  assert.equal(snapshotCalls, 0);
  limited = false;
  const success = await output.exports.GET();
  assert.equal(success.status, 200);
  assert.equal(success.headers["Cache-Control"], "private, no-store");
  fail = true;
  const failed = await output.exports.GET();
  assert.equal(failed.status, 500);
  assert.equal(failed.headers["Cache-Control"], "private, no-store");
  assert.doesNotMatch(JSON.stringify(failed.body), /private-database-password/);
});
