import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { listMonthlyMarketCycles } from "@/lib/data/monthly-market-outlook";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { buildWeeklyMarketSlots } from "@/lib/data/weekly-analysis";
import { listResearchRecords } from "@/lib/data/research-records";

test("September monthly outlook is visible and preserves the source hierarchy", () => {
  const cycles = listMonthlyMarketCycles();
  assert.deepEqual(cycles.map((cycle) => cycle.id), ["2026-08", "2026-09"]);
  const september = cycles.find((cycle) => cycle.id === "2026-09");
  assert.ok(september);
  assert.equal(september.items.length, 9);
  const btc = september.items.find((item) => item.assetId === "bitcoin");
  const eth = september.items.find((item) => item.assetId === "eth");
  const spx = september.items.find((item) => item.assetId === "sp500");
  const ndx = september.items.find((item) => item.assetId === "nasdaq-100");
  const silver = september.items.find((item) => item.assetId === "silver");
  assert.equal(btc?.direction, "先涨后跌");
  assert.match(btc?.path ?? "", /主要高点.*回吐/);
  assert.equal(eth?.direction, "先涨后跌");
  assert.equal(eth?.version, 2);
  assert.equal(eth?.sourceComplete, true);
  assert.match(eth?.keyWindow ?? "", /9月7日至13日.*9日至11日/);
  assert.match(eth?.revisionReason ?? "", /五张周卦.*保留V1/);
  assert.equal(spx?.direction, "震荡下跌");
  assert.ok((spx?.probabilities.down ?? 0) > (spx?.probabilities.up ?? 0));
  assert.equal(ndx?.direction, "震荡下跌");
  assert.ok((ndx?.probabilities.down ?? 0) > (spx?.probabilities.down ?? 0));
  assert.equal(silver?.direction, "先涨后跌");
  for (const item of september.items) {
    assert.equal(item.probabilities.up + item.probabilities.flat + item.probabilities.down, 100, item.symbol);
    assert.equal(item.periodStart, "2026-09-01");
    assert.equal(item.periodEnd, "2026-09-30");
  }
});

test("pre-week revisions use weekly Liu Yao for direction and keep Qimen auxiliary", () => {
  const slots = buildWeeklyMarketSlots(new Date("2026-08-23T12:00:00+08:00"));
  const published = slots.filter((slot) => slot.kind === "published").map((slot) => slot.analysis);
  const btc = published.find((item) => item.assetId === "bitcoin");
  const spx = published.find((item) => item.assetId === "sp500");
  const ndx = published.find((item) => item.assetId === "nasdaq-100");
  assert.equal(btc?.overallDirection, "探底回升");
  assert.equal(spx?.overallDirection, "先涨后跌");
  assert.equal(ndx?.overallDirection, "探底回升");
  for (const item of [btc, spx, ndx]) {
    assert.ok((item?.basisWeights?.liuyao ?? 0) > (item?.basisWeights?.qimen ?? 0));
  }
});

test("BTC September high revision is additive and the newest three-month record wins", () => {
  const rows = listBtcPeriodForecasts20260801().filter(
    (item) => item.forecastType === "MONTH_3" && item.periodStart === "2026-08-01" && item.periodEnd === "2026-10-31"
  );
  assert.equal(rows.some((item) => item.id === "BTC-M3-20260801-V2"), true);
  assert.equal(rows.some((item) => item.id === "BTC-M3-20260823-V3"), true);
  const latest = rows.slice().sort((a, b) => b.version - a.version)[0];
  assert.equal(latest?.version, 3);
  assert.match(latest?.expectedPath ?? "", /9月前中段.*主要高点.*9月中后段.*回吐/);
});

test("new blogger records are anonymous in public attribution and excluded from consensus", async () => {
  const ids = ["ANON-US-MACRO-SEP-20260822", "ANON-US-FLOW-20260821", "ANON-US-STRUCTURE-20260821"];
  const records = (await listResearchRecords()).filter((item) => ids.includes(item.id));
  assert.equal(records.length, ids.length);
  for (const record of records) {
    assert.equal(record.consensusEligible, false);
    assert.equal(record.visibility, "internal");
    assert.ok(record.internalSourceRef);
    assert.doesNotMatch(record.publicSourceLabel.zhCN, /stone|布布|视野/i);
  }
});

test("member focus cards do not expose internal version labels", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/conviction/FocusDossierPanel.tsx"), "utf8");
  assert.equal(source.includes("· V${"), false);
});
