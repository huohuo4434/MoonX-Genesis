import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Vercel build is side-effect free and operational jobs are explicit", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts["vercel-build"], "prisma generate && next build");
  assert.match(pkg.scripts["release:migrate"], /--strict/);
  assert.match(pkg.scripts["release:validate"], /validate-upgrade-readonly/);

  const bootstrap = read("scripts/run-bootstrap-if-requested.ts");
  assert.doesNotMatch(bootstrap, /RUN_ADMIN_BOOTSTRAP === "true" \|\| onVercel/);
  assert.match(bootstrap, /RUN_PAYMENT_EMAIL_TEST === "true"/);

  const postbuild = read("scripts/run-postbuild-safe.ts");
  assert.doesNotMatch(postbuild, /execSync|seed-|smoke-auth|send-payment/);
});

test("release acceptance cannot mutate users, payments, forecasts or trading state", () => {
  const source = read("scripts/validate-upgrade-readonly.ts");
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
  assert.doesNotMatch(source, /createUser\(|updateUserById\(|deleteUser\(|payments\/submit|sendPayment|sendEmail|send-payment|bitget/iu);
  assert.match(source, /mode:\s*"READ_ONLY_POST_DEPLOY"/);
  assert.match(source, /UPGRADE VALIDATION PASSED/);
  assert.match(source, /acceptance-latest\.json/);
  assert.match(source, /timestamped console report remains authoritative/);
});

test("weekly source seed registers the CLI server-only shim before dynamic app imports", () => {
  const source = read("scripts/seed-weekly-liuyao-sources.ts");
  assert.match(source, /^import "\.\/register-server-only-shim";/m);
  assert.match(source, /await import\("\.\.\/lib\/weekly-source\/store"\)/);
});
