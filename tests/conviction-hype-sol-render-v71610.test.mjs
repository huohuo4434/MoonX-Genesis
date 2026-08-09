import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function staticClientAssets(source) {
  const match = source.match(/const isStaticPeriodAsset = \[([\s\S]*?)\]\.includes\(a\.slug\);/);
  assert.ok(match, "client static-period asset list must remain detectable");
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("HYPE and SOL both use the member static-period research renderer", () => {
  const source = read("components/conviction/ConvictionDetailClient.tsx");
  const assets = staticClientAssets(source);
  assert.ok(assets.includes("hype"), "HYPE must stay on PeriodPanel path");
  assert.ok(assets.includes("sol"), "SOL must use PeriodPanel instead of legacy TODAY/TOMORROW/WEEK branch");
  assert.match(source, /isStaticPeriodAsset && payload\.forecast\?\.periods/);
  assert.match(source, /payload\.forecast\.periods\.find\(\(p\) => p\.type === tab\)/);
  assert.match(source, /<PeriodPanel/);
});

test("server payload still exposes HYPE and SOL static published period lists", () => {
  const access = read("lib/data/conviction/access.ts");
  assert.match(access, /if \(assetId === "hype"\) return listHypePeriodForecasts20260809\(\);/);
  assert.match(access, /if \(assetId === "sol"\) return listSolPeriodForecasts20260809\(\);/);
  assert.match(access, /if \(assetId === "hype"\) return HYPE_UPDATED_VISIBLE_PERIOD_ORDER;/);
  assert.match(access, /if \(assetId === "sol"\) return SOL_VISIBLE_PERIOD_ORDER;/);
});

test("latest approved dual-teacher bodies remain present for all visible HYPE/SOL horizons", () => {
  const data = read("lib/data/conviction/hype-sol-20260809.ts");
  const hypeIds = [
    "HYPE-W2-20260809-V6", "HYPE-W3-20260817-V6", "HYPE-W4-20260823-V6",
    "HYPE-M1-20260801-V6", "HYPE-AUTUMN-20260901-V6", "HYPE-Y1-20260731-V6",
    "HYPE-Y2027-20260809-V6", "HYPE-Y10-20260731-V6",
  ];
  const solIds = [
    "SOL-W1-20260809-V3", "SOL-W2-20260817-V3", "SOL-W3-20260824-V3",
    "SOL-M1-20260801-V3", "SOL-AUTUMN-20260901-V3", "SOL-Y2027-20260809-V3",
    "SOL-Y2028-20260809-V3", "SOL-Y10-20260809-V3",
  ];
  for (const id of [...hypeIds, ...solIds]) assert.ok(data.includes(`id: "${id}"`), `missing latest research row ${id}`);
  assert.match(data, /export const HYPE_UPDATED_VISIBLE_PERIOD_ORDER:[\s\S]*?"YEAR_10"/);
  assert.match(data, /export const SOL_VISIBLE_PERIOD_ORDER:[\s\S]*?"YEAR_10"/);
});
