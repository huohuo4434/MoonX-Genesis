import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("sector resonance first render is server driven and loads one dossier on demand", () => {
  const daily = read("components/conviction/DailySectorResonanceBoard.tsx");
  const weekly = read("components/conviction/SectorResonanceBoard.tsx");
  const page = read("app/member/sector-resonance/page.tsx");

  assert.doesNotMatch(daily, /^"use client"/);
  assert.doesNotMatch(daily, /useState\(/);
  assert.match(daily, /prefetch=\{false\}/);
  assert.match(weekly, /rows\.find\(\(row\) => row\.assetId === selectedAssetId\)/);
  assert.match(weekly, /weekly-sector-details-\$\{SECTOR_RESONANCE_GROUP_ORDER\.indexOf\(group\)\}/);
  assert.doesNotMatch(weekly, /rows\.map\(\(row\) => <AssetLiuyaoDossier/);
  assert.match(page, /searchParams/);
  assert.match(page, /selectedAssetId=\{params\.detail\}/);
});
