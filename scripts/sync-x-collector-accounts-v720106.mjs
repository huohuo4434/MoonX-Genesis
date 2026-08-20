import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(projectRoot, "tools", "x-collector", "default-config.json");
const localAppData = process.env.LOCALAPPDATA?.trim();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

if (process.platform !== "win32" || !localAppData) {
  console.log("X collector local sync skipped: not Windows or LOCALAPPDATA unavailable.");
  process.exit(0);
}

const installedConfig = path.join(localAppData, "MOOX-X-Collector", "config.json");
if (!fs.existsSync(installedConfig)) {
  console.log("X collector local sync skipped: local collector is not installed yet.");
  process.exit(0);
}

const registry = readJson(registryPath);
const current = readJson(installedConfig);
const required = Array.isArray(registry.accounts) ? registry.accounts.map(String).filter(Boolean) : [];
const existing = Array.isArray(current.accounts) ? current.accounts.map(String).filter(Boolean) : [];
const byLower = new Map([...existing, ...required].map((value) => [value.toLowerCase(), value]));
const merged = [...byLower.values()];
const changed = JSON.stringify(existing.map((value) => value.toLowerCase()).sort()) !== JSON.stringify(merged.map((value) => value.toLowerCase()).sort());
if (changed) {
  const backup = `${installedConfig}.bak-v720106`;
  if (!fs.existsSync(backup)) fs.copyFileSync(installedConfig, backup);
  current.accounts = merged;
  fs.writeFileSync(installedConfig, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`X collector account registry synchronized: ${existing.length} -> ${merged.length}.`);
  console.log(`Backup: ${backup}`);
} else {
  console.log(`X collector account registry already synchronized: ${merged.length}.`);
}
