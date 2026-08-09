import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('key-person BaZi is a long-horizon corroboration source only', () => {
  const source = read('lib/methodology/key-person-bazi.ts');
  assert.match(source, /defaultWeightPct:\s*5/);
  assert.match(source, /maxWeightPct:\s*10/);
  assert.match(source, /unknownTimeMaxWeightPct:\s*5/);
  assert.match(source, /mayOverrideAssetHexagram:\s*false/);
  assert.match(source, /mayVoteDailyDirection:\s*false/);
  assert.match(source, /maySetTechnicalLevels:\s*false/);
  assert.match(source, /historicalBacktestComplete/);
});

test('member-facing percentages are scenario weights, not direction probabilities', () => {
  const files = [
    'components/member/MemberWeeklyPage.tsx',
    'components/member/MemberMonthlyPage.tsx',
    'components/member/MemberTomorrowPage.tsx',
    'components/home/TodayDailyForecastView.tsx',
    'components/home/TomorrowForecastViews.tsx',
    'app/guide/page.tsx',
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /情景权重|Scenario weights|scenario weights/i, file);
  }
  assert.match(read('app/guide/page.tsx'), /不是方向投票/);
});

test('formal weekly BTC uses pre-period metaphysical V3 and preserves V1/V2 archive', () => {
  const source = read('lib/data/published-weekly-revision-20260810.ts');
  assert.match(source, /WEEKLY-BTC-20260810-V3/);
  assert.match(source, /本周唯一方向：看涨/);
  assert.match(source, /目标周开始前统一MOOX方法论/);
  assert.match(source, /\{ \.\.\.BTC_V2, status: "archived"/);
  assert.match(read('lib/data/weekly-analysis.ts'), /PUBLISHED_WEEKLY_ANALYSES_20260810_V3/);
});

test('publication quality gate blocks broken auto-generated member copy', () => {
  const gate = read('lib/content/publication-quality-gate.ts');
  const pipeline = read('lib/forecasts/daily-pipeline.ts');
  assert.match(gate, /BAD_PUNCTUATION/);
  assert.match(gate, /REPEATED_SENTENCE/);
  assert.match(gate, /INTERNAL_ENUM/);
  assert.match(gate, /SCENARIO_WEIGHT_SUM/);
  assert.match(gate, /不提供虚构价位/);
  assert.match(pipeline, /validateGeneratedDailyPublication/);
  assert.match(pipeline, /publication-quality-gate/);
});

test('admin membership changes require explicit idempotency request and reason', () => {
  const api = read('app/api/admin/users/membership/route.ts');
  const ui = read('components/admin/AdminUserMembershipActions.tsx');
  assert.match(api, /requestId:\s*z\.string\(\)\.uuid\(\)/);
  assert.match(api, /reason:\s*z\.string\(\)\.trim\(\)\.min\(4\)/);
  assert.match(api, /confirmed:\s*z\.literal\(true\)/);
  assert.match(api, /source:\s*"admin_grant"/);
  assert.doesNotMatch(api, /Date\.now\(\)/);
  assert.match(ui, /crypto\.randomUUID\(\)/);
  assert.match(ui, /管理员赠送/);
});

test('P0 audit is explicitly read-only and does not authorize migrations', () => {
  const script = read('scripts/p0-readonly-diff-audit.ts');
  const cmd = read('RUN_MOOX_P0_READONLY_AUDIT.cmd');
  assert.match(script, /migrationAllowed:\s*false/);
  assert.match(script, /READ ONLY|只读/i);
  assert.match(cmd, /READ-ONLY|READ ONLY/i);
  assert.doesNotMatch(script, /\bgrantMembershipFromPlan\s*\(/);
  assert.doesNotMatch(script, /\brevokeMembership\s*\(/);
  assert.doesNotMatch(script, /\.(?:create|update|delete|upsert)\s*\(/);
});


test('automation dashboard distinguishes internal verification rows from the public verification snapshot', () => {
  const cycle = read('lib/automation/cycle.ts');
  const ui = read('components/admin/AdminAutomationClient.tsx');
  assert.match(cycle, /getPublicVerificationSnapshot/);
  assert.match(cycle, /publicVerifications/);
  assert.match(cycle, /publicPending/);
  assert.match(ui, /内部验证流水/);
  assert.match(ui, /公开验证已完成/);
});

test('admin payment queue counts use one aggregation on dashboard and payment page', () => {
  const aggregate = read('lib/payments/admin-payment-summary.ts');
  const dashboard = read('app/admin/page.tsx');
  const payments = read('app/admin/payments/page.tsx');
  assert.match(aggregate, /pendingCount:\s*autoAttention\.length \+ autoProcessing\.length \+ legacyPending\.length/);
  assert.match(dashboard, /getAdminPaymentQueueSummary/);
  assert.match(payments, /getAdminPaymentQueueSummary/);
  assert.match(payments, /pendingCount=\{paymentQueue\.pendingCount\}/);
});

test('member AI desk states the display layer and source explicitly', () => {
  const source = read('components/member/AiTradingDeskClient.tsx');
  assert.match(source, /MEMBER_FEED/);
  assert.match(source, /LIVE_EXPERIMENT/);
  assert.match(source, /PAPER/);
  assert.match(source, /快照时间/);
  assert.match(source, /技术分析不参与多空方向投票/);
});
