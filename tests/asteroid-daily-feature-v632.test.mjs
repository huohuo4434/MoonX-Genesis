import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("Asteroid feature is a single internal promotion slot", () => {
  const list = read("components/conviction/ConvictionListClient.tsx");
  assert.match(list, /import AsteroidWatchlistFeature/);
  assert.equal((list.match(/<AsteroidWatchlistFeature\s*\/>/g) ?? []).length, 1);
  assert.match(list, /filter !== "STOCK"/);
  assert.match(list, /逐日路径/);
});

test("Asteroid current and next week contain a complete daily path", () => {
  const source = read("lib/data/conviction/asteroid-forecasts.ts");
  assert.match(source, /ASTEROID-W1-20260803-V4/);
  assert.match(source, /ASTEROID-W2-20260810-V2/);
  for (let day = 3; day <= 16; day += 1) {
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    assert.match(source, new RegExp(date));
  }
  assert.match(source, /实际走势较原推演提前约1天/);
  assert.match(source, /时间容差/);
  assert.match(source, /weight: 45/);
  assert.match(source, /weight: 40/);
  assert.match(source, /weight: 15/);
});

test("member detail exposes current-week and next-week daily tabs", () => {
  const access = read("lib/data/conviction/access.ts");
  const detail = read("components/conviction/ConvictionDetailClient.tsx");
  assert.match(access, /\["WEEK", "WEEK_2", "MONTH_1"\]/);
  assert.match(access, /本周逐日/);
  assert.match(access, /下周逐日/);
  assert.match(detail, /逐日路径/);
  assert.match(detail, /已验证、进行中与预测分开显示/);
  assert.match(detail, /原始锁定观点/);
});

test("research metadata is refreshed without changing the contract identity", () => {
  const seed = read("lib/data/conviction/seed.ts");
  assert.match(seed, /contractAddress: "0xf280b16ef293d8e534e370794ef26bf312694126"/);
  assert.match(seed, /researchUpdatedAt: "2026-08-06"/);
});
