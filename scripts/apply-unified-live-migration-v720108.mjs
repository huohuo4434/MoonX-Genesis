import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = resolve(process.env.MOOX_PROJECT_ROOT || process.cwd());
const TARGET = "20260818143000_moox_unified_live_v72031";

function placeholder(value) {
  const v = String(value ?? "").trim();
  return !v || /^(change.?me|placeholder|your[_-]?|xxx|todo|null|undefined)$/i.test(v) || /\$\{|<.*>/.test(v);
}
function loadFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    const existing = process.env[key];
    if (!existing || placeholder(existing)) process.env[key] = val;
  }
}
for (const rel of [".vercel/.env.production.local", ".env.production.local", ".env.local", ".env"]) loadFile(join(ROOT, rel));

function chooseUrl() {
  for (const name of ["DIRECT_URL", "MIGRATION_DATABASE_URL"]) {
    const value = String(process.env[name] ?? "").trim();
    if (value) return { name, value, direct: true };
  }
  for (const name of ["DATABASE_URL", "SUPABASE_DB_URL"]) {
    const value = String(process.env[name] ?? "").trim();
    if (value) return { name, value, direct: false };
  }
  return null;
}
function looksPooler(url) {
  try {
    const u = new URL(url);
    return u.port === "6543" || /pooler|supavisor/i.test(u.hostname) || /pgbouncer=true/i.test(u.search);
  } catch { return true; }
}
function runPrisma(args, url, inherit = false) {
  const env = { ...process.env, DATABASE_URL: url };
  if (process.platform === "win32") {
    const cmd = process.env.ComSpec || process.env.COMSPEC || "C:\\Windows\\System32\\cmd.exe";
    return spawnSync(cmd, ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`], { cwd: ROOT, env, shell: false, encoding: inherit ? undefined : "utf8", stdio: inherit ? "inherit" : "pipe" });
  }
  return spawnSync("npx", ["prisma", ...args], { cwd: ROOT, env, shell: false, encoding: inherit ? undefined : "utf8", stdio: inherit ? "inherit" : "pipe" });
}
function text(result) { return `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(); }
function ids(value) { return [...new Set(String(value).match(/20\d{12}_[A-Za-z0-9_-]+/g) ?? [])]; }
function requireOk(result, label) { if (result.error || result.status !== 0) throw new Error(`${label} failed${result.error ? `: ${result.error.message}` : ` with exit code ${result.status}`}`); }

try {
  const migration = join(ROOT, "prisma", "migrations", TARGET, "migration.sql");
  if (!existsSync(migration)) throw new Error(`Target migration source missing: ${migration}`);
  const sql = readFileSync(migration, "utf8");
  if (/\bDROP\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i.test(sql)) throw new Error("Migration safety scan failed: destructive SQL token detected");

  const db = chooseUrl();
  if (!db) throw new Error("No migration database URL loaded. Set DIRECT_URL or MIGRATION_DATABASE_URL (preferred).");
  if (!db.direct && looksPooler(db.value)) throw new Error(`${db.name} looks like a transaction pooler. Set DIRECT_URL or MIGRATION_DATABASE_URL to the direct PostgreSQL connection before migrating.`);

  console.log("============================================================");
  console.log("MOOX V7.20.10.8 - MANUAL UNIFIED LIVE MIGRATION");
  console.log("============================================================");
  console.log(`Project: ${ROOT}`);
  console.log(`DB source variable: ${db.name} (value hidden)`);
  console.log("This script NEVER calls Bitget and NEVER enables live entries.");

  const before = runPrisma(["migrate", "status"], db.value);
  const beforeText = text(before);
  console.log("\nPrisma status before:\n" + beforeText);
  if (/Database schema is up to date/i.test(beforeText) && before.status === 0) {
    console.log("\nNo migration needed. Database is already up to date.");
    process.exit(0);
  }
  const found = ids(beforeText);
  if (!found.includes(TARGET)) throw new Error("Target Unified Live migration is not proven pending; refusing to deploy.");
  const others = found.filter((x) => x !== TARGET);
  if (others.length) throw new Error(`Other migrations are also pending/reported: ${others.join(", ")}. Review them first.`);

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`\nType APPLY to deploy ${TARGET}: `);
  rl.close();
  if (answer.trim() !== "APPLY") {
    console.log("Cancelled. No database change was made.");
    process.exit(0);
  }

  console.log("\nApplying Prisma migration using the direct migration connection...");
  requireOk(runPrisma(["migrate", "deploy"], db.value, true), "prisma migrate deploy");
  requireOk(runPrisma(["generate"], db.value, true), "prisma generate");
  const after = runPrisma(["migrate", "status"], db.value);
  console.log("\nPrisma status after:\n" + text(after));
  requireOk(after, "prisma migrate status");
  console.log("\nUNIFIED LIVE MIGRATION PASSED");
  console.log("Next: redeploy production, refresh AI实盘交易, complete environment/read-only/Cron checks, then manually enable 1000U live from the page.");
} catch (error) {
  console.error("\nMIGRATION STOPPED: " + (error instanceof Error ? error.message : String(error)));
  console.error("No Bitget order was sent and live-entry mode was not changed.");
  process.exitCode = 1;
}
