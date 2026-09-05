import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('live commissioning is enabled by default but still uses MOOX direction and safety gates', () => {
  const source = read('lib/trading-signals/three-horizon-strategy.ts');
  assert.match(source, /BITGET_LIVE_COMMISSIONING_ENABLED\?\.toLowerCase\(\) !== "false"/);
  assert.match(source, /resolveOfficialMooxDirection\(\{ plan, prior, strategyType:/);
  assert.match(source, /forecastDirectionForStrategy\(input\.plan, input\.strategyType\)/);
  assert.match(source, /MOOX玄学方向/);
  assert.match(source, /技术指标替代决定多空/);
  assert.match(source, /MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5/);
  assert.match(source, /prepareAiTradePlanBeforeExecution/);
  assert.match(source, /executeReadyDecision/);
});

test('real-money live safety remains fail-closed on credentials and market safety without requiring an IP whitelist', () => {
  const client = read('lib/bitget/demo-client.ts');
  assert.match(client, /failClosedReady\s*=\s*safeForLiveExperiment/);
  assert.doesNotMatch(client, /failClosedReady\s*=\s*safeForLiveExperiment\s*&&\s*ipWhitelistConfigured/);
  assert.match(client, /提币/);
  assert.match(client, /行情/);
  assert.match(client, /LIVE_EXPERIMENT/);
  const ui = read('components/admin/BitgetDemoClient.tsx');
  assert.doesNotMatch(ui, /IP白名单（实盘必需）/);
  assert.doesNotMatch(ui, /未绑定 · 禁止新开仓/);
  const readiness = read('app/api/admin/bitget-demo/live-readiness/route.ts');
  assert.doesNotMatch(readiness, /id:\s*"ip-whitelist"/);
  const admin = read('app/admin/bitget-demo/page.tsx');
  assert.match(admin, /自动交易启动诊断/);
  assert.match(admin, /CRON_SECRET 未配置/);
  assert.match(admin, /首笔小额闭环默认开启/);
});

test('crypto daily verification aggregates Beijing sessions instead of UTC daily candles', () => {
  const source = read('lib/market-data/daily-prices.ts');
  assert.match(source, /fetchYahooCryptoBeijingBars/);
  assert.match(source, /Asia\/Shanghai/);
  assert.match(source, /yahoo-finance-hourly-beijing/);
  assert.match(source, /fetchCoinGeckoCryptoBars/);
  assert.match(source, /coingecko-beijing-session/);
});

test('daily verification retries hourly and explicitly defers post-run aggregates', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const verify = vercel.crons.find((row) => row.path === '/api/cron/verify-daily');
  assert.deepEqual(verify, { path: '/api/cron/verify-daily', schedule: '10 * * * *' });
  assert.equal(vercel.crons.some((row) => row.path === '/api/cron/verify-daily-late'), false);
  const route = read('app/api/cron/verify-daily/route.ts');
  assert.doesNotMatch(route, /getPublicVerificationSnapshot|getVerificationPipelineStatus/);
  assert.match(route, /publicAfterRun: null/);
  assert.match(route, /pipelineAfterRun: null/);
  assert.match(route, /diagnosticsDeferred: true/);
  assert.match(route, /deadlineAt/);
});

test('terminal same-day verification may be published while future records stay hidden', () => {
  const filter = read('lib/accuracy/public-history-filter.ts');
  assert.match(filter, /r\.forecastDate > todayKey/);
  assert.doesNotMatch(filter, /r\.forecastDate < todayKey/);
});

test('future TRC20 payments keep autonomous hash discovery and membership activation', () => {
  const cron = read('app/api/cron/reconcile-payments/route.ts');
  const process = read('lib/payments/process-auto-payment.ts');
  const vercel = JSON.parse(read('vercel.json'));
  const reconcile = vercel.crons.find((row) => row.path === '/api/cron/reconcile-payments');
  assert.deepEqual(reconcile, { path: '/api/cron/reconcile-payments', schedule: '* * * * *' });
  assert.match(process, /discoverTronTransferHash/);
  assert.match(process, /finalizeAutoPaymentMembership/);
  assert.match(cron, /reconcileAutoPayments/);
});


test('member AI desk exposes MEMBER_FEED with explicit PAPER/LIVE source and never falls back to the legacy Bitget demo label', () => {
  const member = read('components/member/AiTradingDeskClient.tsx');
  assert.match(member, /AI交易执行台/);
  assert.match(member, /MEMBER_FEED/);
  assert.match(member, /LIVE_EXPERIMENT/);
  assert.match(member, /PAPER/);
  assert.match(member, /技术分析不参与多空方向投票/);
  assert.doesNotMatch(member, /Bitget 模拟实验/);
});
