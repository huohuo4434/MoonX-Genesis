import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localAppData = process.env.LOCALAPPDATA?.trim();

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
  catch { return fallback; }
}

if (process.platform !== "win32" || !localAppData) {
  console.log("X collector history sync skipped: not Windows or LOCALAPPDATA unavailable.");
  process.exit(0);
}

const appDir = path.join(localAppData, "MOOX-X-Collector");
const installedConfig = path.join(appDir, "config.json");
const installedCollector = path.join(appDir, "collector.py");
const projectConfig = path.join(projectRoot, "tools", "x-collector", "default-config.json");
const projectCollector = path.join(projectRoot, "tools", "x-collector", "collector.py");

if (!fs.existsSync(installedConfig) || !fs.existsSync(installedCollector)) {
  console.log("X collector history sync skipped: local collector is not installed yet.");
  process.exit(0);
}
if (!fs.existsSync(projectConfig) || !fs.existsSync(projectCollector)) {
  throw new Error("Project X collector payload is incomplete.");
}

const desired = readJson(projectConfig);
const current = readJson(installedConfig);
const desiredAccounts = Array.isArray(desired.accounts) ? desired.accounts.map(String).filter(Boolean) : [];
const currentAccounts = Array.isArray(current.accounts) ? current.accounts.map(String).filter(Boolean) : [];
const byLower = new Map([...currentAccounts, ...desiredAccounts].map((value) => [value.toLowerCase(), value]));
current.accounts = [...byLower.values()];
current.max_posts_per_account = Math.max(20, Number(current.max_posts_per_account) || 0);
current.history_backfill_posts_per_account = Math.max(120, Number(current.history_backfill_posts_per_account) || 0);
current.lookback_hours = Math.max(240, Number(current.lookback_hours) || 0);
current.timeout_seconds = Math.max(60, Number(current.timeout_seconds) || 0);

const configBackup = `${installedConfig}.bak-v720107`;
const collectorBackup = `${installedCollector}.bak-v720107`;
if (!fs.existsSync(configBackup)) fs.copyFileSync(installedConfig, configBackup);
if (!fs.existsSync(collectorBackup)) fs.copyFileSync(installedCollector, collectorBackup);
fs.writeFileSync(installedConfig, JSON.stringify(current, null, 2) + "\n", "utf8");
fs.copyFileSync(projectCollector, installedCollector);

console.log(`X collector upgraded for 10-day history: ${current.accounts.length} accounts.`);
console.log(`lookback_hours=${current.lookback_hours}, regular_max=${current.max_posts_per_account}, initial_backfill_max=${current.history_backfill_posts_per_account}`);
console.log("Credentials / DPAPI secret were not read or modified.");
