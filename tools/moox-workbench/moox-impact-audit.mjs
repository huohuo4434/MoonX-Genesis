import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");

function run(command, commandArgs) {
  try {
    return execFileSync(command, commandArgs, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function normalize(file) {
  return file.replaceAll("\\", "/").replace(/^\.\//, "").trim();
}

function getChangedFiles() {
  const explicitIndex = process.argv.indexOf("--files");
  if (explicitIndex >= 0) {
    return process.argv.slice(explicitIndex + 1).filter((item) => !item.startsWith("--")).map(normalize);
  }
  const staged = run("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"]);
  const unstaged = run("git", ["diff", "HEAD", "--name-only", "--diff-filter=ACMRTUXB"]);
  const raw = staged || unstaged;
  return [...new Set(raw.split(/\r?\n/).map(normalize).filter(Boolean))];
}

const changedFiles = getChangedFiles();
const categories = {
  liveTrading: changedFiles.filter((file) => /^(lib\/bitget|lib\/trading-signals|app\/api\/cron\/.*trad|types\/(ai-trade|trading))/i.test(file)),
  authPayments: changedFiles.filter((file) => /^(lib\/(auth|payments)|app\/api\/.*(payment|membership)|app\/admin\/(payments|users))/i.test(file)),
  database: changedFiles.filter((file) => /^(prisma\/|supabase\/)/i.test(file)),
  apiRoutes: changedFiles.filter((file) => /^app\/api\/.*\/route\.ts$/i.test(file)),
  ui: changedFiles.filter((file) => /^(app\/(?!api)|components\/)/i.test(file)),
  tests: changedFiles.filter((file) => /^tests\//i.test(file)),
  docs: changedFiles.filter((file) => /^(docs\/|AGENTS\.md$|README)/i.test(file)),
};

const suggestedTests = new Set();
for (const file of changedFiles) {
  if (/ai-committee/i.test(file)) suggestedTests.add("tests/ai-committee-phase1.test.ts");
  if (/lib\/bitget|live-execution/i.test(file)) {
    suggestedTests.add("tests/trading-reliability-phase4.test.ts");
    suggestedTests.add("tests/three-horizon-strategy.test.ts");
  }
  if (/payments|membership/i.test(file)) {
    suggestedTests.add("tests/payments.test.ts");
    suggestedTests.add("tests/membership-protect.test.ts");
  }
  if (/conviction|stocks/i.test(file)) suggestedTests.add("tests/featured-stocks.test.ts");
  if (/daily-forecast|verification/i.test(file)) suggestedTests.add("tests/daily-accuracy.test.ts");
}

const findings = [];
function add(severity, id, message, file = null) {
  findings.push({ severity, id, message, file });
}

if (!changedFiles.length) add("INFO", "no-diff", "未检测到Git差异；可用 --files 显式传入文件列表。");

for (const file of categories.apiRoutes) {
  const full = resolve(root, file);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8");
  const isPublic =
    /app\/api\/(public|health|cron)\//i.test(file) ||
    /app\/api\/auth\/(login|register|ensure-confirmed)\/route\.ts$/i.test(file);
  const protectedRoute = /requireAdmin|requireActiveMember|requireMember|authorization|CRON_SECRET|verifyCron/i.test(text);
  if (!isPublic && !protectedRoute) add("BLOCKER", "api-auth", "API路由未发现明确的鉴权或Cron验证。", file);
}

if (changedFiles.includes("prisma/schema.prisma")) {
  const migrationChanged = changedFiles.some((file) => /^prisma\/migrations\//.test(file));
  if (!migrationChanged) add("BLOCKER", "missing-migration", "修改了Prisma schema，但没有对应迁移目录。", "prisma/schema.prisma");
}

if (categories.liveTrading.length && !categories.tests.some((file) => /trading|live-execution|bitget/i.test(file))) {
  add("BLOCKER", "live-test-gap", "实盘或交易核心发生变化，但差异中没有对应交易测试。", categories.liveTrading[0]);
}

for (const file of categories.liveTrading) {
  const full = resolve(root, file);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8");
  if (/paptrading\s*[:=]\s*["']1["']/.test(text) && /LIVE_EXPERIMENT|BITGET_LIVE/.test(text)) {
    add("WARNING", "demo-header-review", "同一文件同时出现Demo请求头和实盘逻辑，必须人工核对分支隔离。", file);
  }
}

const envVars = new Set();
for (const file of changedFiles) {
  const full = resolve(root, file);
  if (!existsSync(full) || !/\.(?:ts|tsx|js|mjs|cjs)$/.test(file)) continue;
  const text = readFileSync(full, "utf8");
  for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) envVars.add(match[1]);
}
if (envVars.size && !categories.docs.length) {
  add("WARNING", "env-doc-gap", `差异引用环境变量但未修改文档：${[...envVars].sort().join(", ")}`);
}

const riskScore =
  categories.liveTrading.length * 8 +
  categories.authPayments.length * 5 +
  categories.database.length * 6 +
  categories.apiRoutes.length * 3 +
  categories.ui.length;
const riskLevel = riskScore >= 18 ? "CRITICAL" : riskScore >= 8 ? "HIGH" : riskScore >= 3 ? "MEDIUM" : "LOW";

const report = {
  generatedAt: new Date().toISOString(),
  root,
  changedFiles,
  categories,
  riskScore,
  riskLevel,
  suggestedTests: [...suggestedTests].sort(),
  environmentVariables: [...envVars].sort(),
  findings,
  blockerCount: findings.filter((item) => item.severity === "BLOCKER").length,
};

const outputDir = resolve(root, ".moox-workbench");
mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "impact-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

const markdown = [
  "# MOOX Impact Report",
  "",
  `- Generated: ${report.generatedAt}`,
  `- Risk: **${riskLevel}** (${riskScore})`,
  `- Changed files: ${changedFiles.length}`,
  `- Blockers: ${report.blockerCount}`,
  "",
  "## Changed files",
  ...(changedFiles.length ? changedFiles.map((file) => `- \`${file}\``) : ["- None detected"]),
  "",
  "## Suggested tests",
  ...(report.suggestedTests.length ? report.suggestedTests.map((file) => `- \`${file}\``) : ["- Run targeted tests based on the task scope."]),
  "",
  "## Environment variables",
  ...(report.environmentVariables.length ? report.environmentVariables.map((name) => `- \`${name}\``) : ["- No changed-file references detected."]),
  "",
  "## Findings",
  ...(findings.length ? findings.map((item) => `- **${item.severity}** ${item.id}: ${item.message}${item.file ? ` (\`${item.file}\`)` : ""}`) : ["- No findings."]),
  "",
].join("\n");
writeFileSync(resolve(outputDir, "impact-report.md"), markdown, "utf8");

console.log(`MOOX impact audit: ${riskLevel}, ${changedFiles.length} files, ${report.blockerCount} blocker(s).`);
console.log(`Report: ${relative(root, resolve(outputDir, "impact-report.md"))}`);
if (strict && report.blockerCount > 0) process.exit(1);
