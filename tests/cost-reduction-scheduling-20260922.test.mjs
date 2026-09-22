import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const schedules = new Map(config.crons.map(({ path, schedule }) => [path, schedule]));

test('retired optional monitoring has no production schedule', () => {
  for (const name of ['external-analysts', 'x-intelligence-report', 'vibe-refresh', 'generate-social-cards', 'process-lessons', 'strategy-ensemble', 'qimen-shadow']) {
    assert.equal(schedules.has(`/api/cron/${name}`), false, name);
  }
});

test('price, payment, membership and trading safety cadence is preserved', () => {
  for (const [name, schedule] of Object.entries({
    'daily-candle-projections': '25 * * * *',
    'member-ai-desk-sync': '*/2 * * * *',
    'reconcile-payments': '* * * * *',
    'expire-memberships': '0 3 * * *',
    'prediction-auto-trader': '* * * * *',
    'trading-watchdog': '*/5 * * * *',
    'bitget-runtime-health': '* * * * *',
    'live-trading-custodian': '*/5 * * * *',
  })) assert.equal(schedules.get(`/api/cron/${name}`), schedule, name);
  assert.equal(schedules.size, config.crons.length);
});

test('freshness checks cannot silently restart blogger collection', () => {
  const source = readFileSync(new URL('../lib/automation/content-freshness.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /refreshExternalAnalystSignals|generateAndStoreXScanReport|getXIntelligenceSnapshot/);
  assert.match(source, /已按用户要求停止博主自动监测及补跑/);
  assert.match(source, /item.key !== "x" && item.status !== "OK"/);
});
