import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/admin/bitget-demo/live-readiness/route.ts', 'utf8');
const record = fs.readFileSync('lib/data/external-viewpoints-followup-20260801.ts', 'utf8');

test('readiness route is read-only by construction', () => {
  assert.match(route, /writeAttempted: false/);
  assert.match(route, /BLOCKED_BY_DESIGN/);
  assert.doesNotMatch(route, /placeBitgetDemoMarketOrder/);
  assert.doesNotMatch(route, /trade\/place-order/);
  assert.doesNotMatch(route, /trade\/place-strategy-order/);
});

test('memory viewpoint is low-weight research, not an automatic trade trigger', () => {
  const start = record.indexOf('id: "EXT-MEMORY-CYCLE-20260808"');
  assert.ok(start >= 0);
  const block = record.slice(start, start + 12000);
  assert.match(block, /consensusEligible: false/);
  assert.match(block, /policy:memory-industry-cycle/);
  assert.match(block, /不进入MoonX方向权重/);
  assert.match(block, /MU：DRAM\/HBM紧缺/);
  assert.match(block, /SNDK：NAND供需紧张/);
});
