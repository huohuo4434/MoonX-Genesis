import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(process.env.MOOX_PROJECT_ROOT || process.cwd());
const TARGET = "20260818143000_moox_unified_live_v72031";

function placeholder(value) {
  const v = String(value ?? "").trim();
  return !v || /^(change.?me|placeholder|your[_-]?|xxx|todo|null|undefined)$/i.test(v) || /\$\{|<.*>/.test(v);
}
function loadFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
function loadEnv() {
  for (const rel of [".vercel/.env.production.local", ".env.production.local", ".env.local", ".env"]) loadFile(join(ROOT, rel));
}
function bool(name) { return String(process.env[name] ?? "").trim().toLowerCase() === "true"; }
function has(name) { return Boolean(String(process.env[name] ?? "").trim()); }
function migrationUrlInfo() {
  for (const name of ["DIRECT_URL", "MIGRATION_DATABASE_URL", "DATABASE_URL", "SUPABASE_DB_URL"]) {
    const value = String(process.env[name] ?? "").trim();
    if (value) return { name, value };
  }
  return { name: null, value: null };
}
function runPrisma(args, databaseUrl) {
  const env = { ...process.env, ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}) };
  if (process.platform === "win32") {
    const cmd = process.env.ComSpec || process.env.COMSPEC || "C:\\Windows\\System32\\cmd.exe";
    return spawnSync(cmd, ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`], { cwd: ROOT, env, shell: false, encoding: "utf8" });
  }
  return spawnSync("npx", ["prisma", ...args], { cwd: ROOT, env, shell: false, encoding: "utf8" });
}
function ids(text) { return [...new Set(String(text).match(/20\d{12}_[A-Za-z0-9_-]+/g) ?? [])]; }

loadEnv();
console.log("============================================================");
console.log("MOOX V7.20.10.8 - 1000U LIVE READINESS (READ ONLY)");
console.log("============================================================");
console.log(`Project: ${ROOT}`);

const migrationFile = join(ROOT, "prisma", "migrations", TARGET, "migration.sql");
console.log(`Unified Live migration source: ${existsSync(migrationFile) ? "OK" : "MISSING"} (${TARGET})`);

const authoritativeControl = String(process.env.MOOX_TRADING_CONTROL_MODE ?? "").trim().toUpperCase();
const operationalChecks = authoritativeControl
  ? [["MOOX_TRADING_CONTROL_MODE=LIVE", authoritativeControl === "LIVE"]]
  : [
      ["LEGACY MOOX_UNIFIED_LIVE_MODE=LIVE", String(process.env.MOOX_UNIFIED_LIVE_MODE ?? "").trim().toUpperCase() === "LIVE"],
      ["LEGACY MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH=true", bool("MOOX_UNIFIED_LIVE_ALLOW_LIVE_SWITCH")],
      ["LEGACY MOOX_UNIFIED_LIVE_NEW_ENTRIES=true", bool("MOOX_UNIFIED_LIVE_NEW_ENTRIES")],
      ["LEGACY MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT=true", process.env.MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT == null || bool("MOOX_UNIFIED_LIVE_POSITION_MANAGEMENT")],
      ["LEGACY MOOX_LIVE_ACTIVE_EXECUTION_V641 not false", String(process.env.MOOX_LIVE_ACTIVE_EXECUTION_V641 ?? "true").trim().toLowerCase() !== "false"],
      ["LEGACY BITGET_TRADING_MODE=LIVE_EXPERIMENT", ["LIVE", "LIVE_EXPERIMENT", "REAL", "REAL_TRADING"].includes(String(process.env.BITGET_TRADING_MODE ?? "").trim().toUpperCase())],
      ["LEGACY BITGET_LIVE_EXECUTION_ALLOWED=true", bool("BITGET_LIVE_EXECUTION_ALLOWED")],
    ];
const envChecks = [
  ...operationalChecks,
  ["BITGET_LIVE_API_KEY present", has("BITGET_LIVE_API_KEY")],
  ["BITGET_LIVE_SECRET_KEY present", has("BITGET_LIVE_SECRET_KEY")],
  ["BITGET_LIVE_PASSPHRASE present", has("BITGET_LIVE_PASSPHRASE")],
  ["BITGET_LIVE_CONFIRMATION=I_ACCEPT_REAL_LOSS", String(process.env.BITGET_LIVE_CONFIRMATION ?? "").trim() === "I_ACCEPT_REAL_LOSS"],
  ["BITGET_LIVE_INITIAL_CAPITAL_USDT=1000 (or code default)", process.env.BITGET_LIVE_INITIAL_CAPITAL_USDT == null || Math.abs(Number(process.env.BITGET_LIVE_INITIAL_CAPITAL_USDT) - 1000) < 0.01],
  ["CRON_SECRET present", has("CRON_SECRET")],
];
console.log("\nLocal/linked production env presence (values/secrets are NOT printed):");
console.log(authoritativeControl ? "Control source: MOOX_TRADING_CONTROL_MODE" : "Control source: LEGACY COMPATIBILITY");
for (const [label, ok] of envChecks) console.log(`${ok ? "[OK]" : "[--]"} ${label}`);

try {
  const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  const cron = (vercel.crons ?? []).find((x) => x.path === "/api/cron/prediction-auto-trader");
  console.log(`\nMinute runner in vercel.json: ${cron?.schedule === "* * * * *" ? "OK" : "MISSING/WRONG"} ${cron?.schedule ?? ""}`);
} catch { console.log("\nMinute runner in vercel.json: UNKNOWN"); }

const db = migrationUrlInfo();
console.log(`Migration connection variable: ${db.name ?? "NONE"} (value hidden)`);
if (!db.value) {
  console.log("MIGRATION STATUS: NOT CHECKED - no DIRECT_URL / MIGRATION_DATABASE_URL / DATABASE_URL / SUPABASE_DB_URL loaded.");
  console.log("Use a direct PostgreSQL migration URL. Do not paste database passwords into chat or this package.");
  process.exitCode = 2;
} else {
  const result = runPrisma(["migrate", "status"], db.value);
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  console.log("\nPrisma migrate status:");
  console.log(text);
  const found = ids(text);
  if (/Database schema is up to date/i.test(text) && result.status === 0) {
    console.log("\nRESULT: DATABASE UP TO DATE. Redeploy/refresh the member live page.");
  } else if (found.includes(TARGET)) {
    const others = found.filter((x) => x !== TARGET);
    if (others.length) {
      console.log(`\nRESULT: BLOCKED - other migration IDs are also pending/reported: ${others.join(", ")}`);
      process.exitCode = 3;
    } else {
      console.log(`\nRESULT: TARGET PENDING - ${TARGET}`);
      console.log("Next: run APPLY_UNIFIED_LIVE_MIGRATION.cmd if you intend to apply this reviewed additive migration.");
    }
  } else {
    console.log("\nRESULT: target pending state was not proven. Do not force-apply; review DB connection/status first.");
    process.exitCode = result.status || 2;
  }
}
