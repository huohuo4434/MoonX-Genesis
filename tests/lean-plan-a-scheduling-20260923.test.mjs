import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const retained = {
  '/api/cron/daily-candle-projections': '25 * * * *',
  '/api/cron/member-ai-desk-sync': '*/2 * * * *',
  '/api/cron/reconcile-payments': '* * * * *',
  '/api/cron/expire-memberships': '0 3 * * *',
  '/api/cron/prediction-auto-trader': '* * * * *',
  '/api/cron/trading-watchdog': '*/5 * * * *',
  '/api/cron/bitget-runtime-health': '* * * * *',
  '/api/cron/live-trading-custodian': '*/5 * * * *',
};

test('plan A first stage keeps exactly the existing price, payment, membership and trading schedules', () => {
  assert.equal(config.crons.length, Object.keys(retained).length);
  assert.deepEqual(Object.fromEntries(config.crons.map(({ path, schedule }) => [path, schedule])), retained);
});

test('standalone automatic research and verification jobs are no longer scheduled', () => {
  const paths = new Set(config.crons.map(({ path }) => path));
  for (const name of ['generate-daily-forecasts', 'moonx-cycle', 'sync-verification', 'verify-daily', 'verify-weekly', 'prepare-focus-week', 'crypto-beijing-reverify', 'watchlist-weekly-daily']) {
    assert.equal(paths.has(`/api/cron/${name}`), false, name);
    // Retirement is scheduling-only, not destruction of historical/manual capabilities.
    assert.ok(readFileSync(new URL(`../app/api/cron/${name}/route.ts`, import.meta.url), 'utf8').length);
  }
});
