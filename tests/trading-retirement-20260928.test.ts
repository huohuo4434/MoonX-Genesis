import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTOMATED_TRADING_RETIRED, assertTradingWriteAllowed } from '../lib/trading-retirement';
import { readUnifiedLiveRuntimeConfig, isUnifiedLiveActiveExecutionEnabled } from '../lib/trading-signals/unified-live-config';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const jobs = ['member-ai-desk-sync', 'prediction-auto-trader', 'trading-watchdog', 'bitget-runtime-health', 'live-trading-custodian'];
test('retirement blocks every signed exchange mutation but permits read-only GET', () => {
  assert.equal(AUTOMATED_TRADING_RETIRED, true);
  assert.doesNotThrow(() => assertTradingWriteAllowed('GET'));
  for (const method of ['POST', 'DELETE', 'PUT', 'PATCH']) assert.throws(() => assertTradingWriteAllowed(method), /AUTOMATED_TRADING_RETIRED/);
  const source = read('lib/bitget/demo-client.ts');
  const signed = source.slice(source.indexOf('async function signedRequestOnce'));
  assert.ok(signed.indexOf('assertTradingWriteAllowed(input.method)') < signed.indexOf('credentials()'));
  assert.match(source, /executionAllowed: AUTOMATED_TRADING_RETIRED \? false/);
});
test('old LIVE environment cannot enable entries or custody', () => {
  const before = process.env.MOOX_TRADING_CONTROL_MODE;
  try {
    process.env.MOOX_TRADING_CONTROL_MODE = 'LIVE';
    const config = readUnifiedLiveRuntimeConfig();
    assert.equal(config.mode, 'PAUSED');
    assert.equal(config.allowLiveSwitch, false);
    assert.equal(config.allowNewEntriesByEnv, false);
    assert.equal(config.positionManagementEnabled, false);
    assert.equal(isUnifiedLiveActiveExecutionEnabled(), false);
  } finally { if (before === undefined) delete process.env.MOOX_TRADING_CONTROL_MODE; else process.env.MOOX_TRADING_CONTROL_MODE = before; }
});
test('five retired jobs are unscheduled and return before any work after authorization', () => {
  const config = JSON.parse(read('vercel.json'));
  for (const job of jobs) {
    assert.equal(config.crons.some((item: {path: string}) => item.path === '/api/cron/' + job), false);
    const route = read('app/api/cron/' + job + '/route.ts');
    const handler = route.slice(route.indexOf('export async function GET'));
    assert.ok(handler.indexOf('status: 401') < handler.indexOf('if (AUTOMATED_TRADING_RETIRED)'));
    assert.match(handler, /skipped: "AUTOMATED_TRADING_RETIRED"/);
  }
});
test('custody returns before account creation, exchange reads or cancellation', () => {
  const source = read('lib/trading-signals/unified-live-runtime.ts');
  const cycle = source.slice(source.indexOf('export async function runUnifiedLiveCustodyCycle'));
  assert.ok(cycle.indexOf('if (AUTOMATED_TRADING_RETIRED)') < cycle.indexOf('ensureUnifiedLiveAccount'));
});
test('admin write route stays authenticated and refuses all old controls', () => {
  const source = read('app/api/admin/live-trading/route.ts');
  const post = source.slice(source.indexOf('export async function POST'));
  assert.ok(post.indexOf('if (!actor)') < post.indexOf('if (AUTOMATED_TRADING_RETIRED)'));
  assert.ok(post.indexOf('status: 409') < post.indexOf('request.json()'));
});
test('manual runtime and legacy paper transports cannot execute after retirement', () => {
  const runtime = read('lib/bitget/demo-runtime.ts').split('export async function runBitgetDemoServerRuntime')[1];
  assert.ok(runtime.indexOf('assertTradingWriteAllowed("POST")') < runtime.indexOf('ensureBitgetRuntimeTables'));
  const executor = read('lib/trading-signals/executor.ts');
  for (const name of ['sendGenericPaperWebhook', 'submitAlpacaPaperOrder', 'submitOkxDemoOrder']) {
    const block = executor.split('export async function ' + name)[1].split('export async function')[0];
    assert.ok(block.indexOf('assertTradingWriteAllowed("POST")') < block.indexOf('fetch('));
  }
});
