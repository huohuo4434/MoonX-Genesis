import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('reviewer: LIVE new-open path is fail-closed but reduce-only exits stay available', () => {
  const source = read('lib/bitget/demo-client.ts');
  assert.match(source, /failClosedReady\s*=\s*safeForLiveExperiment\s*&&\s*ipWhitelistConfigured/);
  assert.match(source, /if \(!security\.failClosedReady\)/);
  assert.match(source, /超过180秒，禁止新开仓/);
  assert.match(source, /Missing IP whitelist must block NEW orders\/startup, but must not implicitly/);
  assert.match(source, /reduce-only closes/);
  // The open guard must remain tied to the open-order path, not all writes.
  assert.match(source, /assertLiveExperimentOpenAllowed/);
  assert.match(source, /reduceOnly/);
});

test('reviewer: LIVE readiness requires no withdrawal permission and an IP whitelist', () => {
  const source = read('app/api/admin/bitget-demo/live-readiness/route.ts');
  assert.match(source, /requireAdmin/);
  assert.match(source, /API IP白名单/);
  assert.match(source, /failClosedReady|ipWhitelistConfigured/);
  assert.match(source, /提币/);
});

test('reviewer: technical analysis cannot manufacture or flip strategy direction', () => {
  const source = read('lib/trading-signals/three-horizon-strategy.ts');
  assert.match(source, /Official MOOX side selector/);
  assert.match(source, /Technical signals never enter this vote/);
  assert.match(source, /resolveOfficialMooxDirection/);
  assert.match(source, /正式方向冲突/);
  assert.match(source, /玄学\/正式预测来源没有形成唯一方向；技术分析不得替它决定多空/);
  assert.match(source, /plan:\s*undefined,\s*\n\s*prior:\s*null/);
});


test('reviewer: X intelligence, market progress and point guidance cannot overwrite official direction', () => {
  const x = read('lib/trading-signals/x-intelligence-overlay.ts');
  const weeklyToDaily = read('lib/forecasts/weekly-to-daily.ts');
  const progress = read('lib/forecasts/market-progress.ts');
  const point = read('lib/forecasts/crypto-point-guidance.ts');
  assert.doesNotMatch(x, /direction = shift > 0/);
  assert.match(x, /never owns the official bullish\/bearish direction/);
  assert.doesNotMatch(weeklyToDaily, /direction = assessed\.direction/);
  assert.match(progress, /不倒改玄学方向/);
  assert.doesNotMatch(point, /direction:\s*"(?:震荡下跌|先跌后涨|探底回升)"/);
  assert.match(point, /never replaces the/);
});

test('reviewer: admin membership route keeps admin authorization and explicit audit inputs', () => {
  const source = read('app/api/admin/users/membership/route.ts');
  assert.match(source, /if \(!\(await requireAdmin\(\)\)\)/);
  assert.match(source, /operatorId/);
  assert.match(source, /reason=/);
  assert.match(source, /sourceId:\s*`admin_/);
});

test('reviewer: no package step may run the state-changing P0 migration automatically', () => {
  const cmd = read('RUN_MOOX_P0_READONLY_AUDIT.cmd');
  assert.doesNotMatch(cmd, /--write/i);
  assert.match(cmd, /p0-readonly-diff-audit\.ts/);
});
