import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const revisionPath = path.join(root, "lib", "data", "published-weekly-revision-20260810.ts");
const loaderPath = path.join(root, "lib", "data", "weekly-analysis.ts");
const sourcePath = path.join(root, "data", "imports", "liuyao-teacher02-weekly-20260810.json");

const revision = fs.readFileSync(revisionPath, "utf8");
const loader = fs.readFileSync(loaderPath, "utf8");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

test("V7.8 keeps the old V1 module and switches the active loader to V2", () => {
  assert.match(loader, /published-weekly-revision-20260810/);
  assert.match(loader, /PUBLISHED_WEEKLY_ANALYSES_20260810_V2/);
  assert.match(loader, /ARCHIVED_WEEKLY_ANALYSES_20260810/);
  assert.match(revision, /WEEKLY-BTC-20260810-V2/);
  assert.match(revision, /WEEKLY-GOLD-20260810-V2/);
  assert.match(revision, /BASE_BTC_V1/);
  assert.match(revision, /BASE_GOLD_V1/);
});

test("publishes ETH and silver but deliberately leaves WTI pending", () => {
  assert.match(revision, /id: "WEEKLY-ETH-20260810-V1"/);
  assert.match(revision, /assetId: "eth"/);
  assert.match(revision, /id: "WEEKLY-SILVER-20260810-V1"/);
  assert.match(revision, /assetId: "silver"/);
  assert.doesNotMatch(revision, /WEEKLY-WTI-20260810/);
});

test("ETH carries only the two explicit single-day key dates", () => {
  assert.match(revision, /date: "2026-08-12"/);
  assert.match(revision, /date: "2026-08-15"/);
  assert.match(revision, /多头启动关键日/);
  assert.match(revision, /阶段高点\/冲高回落关键日/);
});

test("gold and silver keep range timing instead of inventing exact daily points", () => {
  assert.match(revision, /2026-08-10至11日/);
  assert.match(revision, /2026-08-11至12日/);
  assert.match(revision, /2026-08-13至2026-08-14/);
  assert.equal(source.forwardViews.silver.technicalReference62.publishAsFormalLevel, false);
});

test("source cannot independently trigger trading and does not raise total method weight", () => {
  assert.equal(source.weightPolicy.canTriggerTradeAlone, false);
  assert.equal(source.weightPolicy.raisesTotalMethodWeight, false);
  assert.match(revision, /第二位老师只进入六爻内部交叉验证/);
});
