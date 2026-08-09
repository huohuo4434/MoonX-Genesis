import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('commissioning can use the full live allow-list while BTC/ETH remain preferred', () => {
  const source = read('lib/trading-signals/three-horizon-strategy.ts');
  assert.match(source, /LIVE_COMMISSIONING_PREFERRED_SYMBOLS/);
  assert.match(source, /environment\.liveAllowedSymbols/);
  assert.match(source, /commissioningUniverse/);
  assert.match(source, /getContractConfig\(symbol\)/);
  assert.match(source, /resolveOfficialMooxDirection/);
  assert.match(source, /official\.direction === "NEUTRAL"/);
  assert.match(source, /技术指标替代决定多空/);
});

test('technical momentum may rank the execution candidate but cannot set LONG or SHORT', () => {
  const source = read('lib/trading-signals/three-horizon-strategy.ts');
  assert.match(source, /direction: official\.direction/);
  assert.match(source, /Direction strength decides the side and dominates selection/);
  assert.doesNotMatch(source, /direction:\s*input\.momentumScore\s*[><=]/);
});

test('expired plans are audit history and cannot mask a current live decision', () => {
  const source = read('components/trading/AiTradeIntentBoard.tsx');
  assert.match(source, /filter\(\(row\) => !TERMINAL\.has\(row\.status\)\)/);
  assert.match(source, /过期计划只进入历史审计/);
});

test('admin copy explains the widened commissioning pool without weakening hard gates', () => {
  const source = read('app/admin/bitget-demo/page.tsx');
  assert.match(source, /BTC\/ETH优先/);
  assert.match(source, /MOOX玄学方向最明确/);
  assert.match(source, /实盘安全闸门/);
});
