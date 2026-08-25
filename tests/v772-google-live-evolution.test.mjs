import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (rel) => fs.readFileSync(rel, 'utf8');

test('LIVE has one real activation target without removing hard risk gates', () => {
  const s = read('lib/trading-signals/three-horizon-strategy.ts');
  assert.match(s, /LIVE_ACTIVITY_TARGET = Math\.floor\(envNumber\(/);
  assert.match(s, /MOOX_LIVE_ACTIVITY_TARGET_V641", 1, 1, 5/);
  assert.match(s, /LIVE_NATIVE_RISK_GATE/);
  assert.match(s, /LIVE_ACTIVITY_PROBE_RISK_PCT/);
  assert.match(s, /decision\.technicalScore >= 34/);
  assert.match(s, /condition\.key === "entry" && condition\.met/);
  assert.match(s, /decisionRewardRisk\(decision\) >= 1\.05/);
  assert.match(s, /PROJECTED_OPEN_RISK_LIMIT/);
  assert.match(s, /SYMBOL_POSITION_EXISTS/);
});

test('Google research is coherent across total, weekly and later-month hexagrams', () => {
  const s = read('lib/data/conviction/google-focus-research-20260808.ts');
  for (const token of ['地泽临 → 地天泰（六合）','泽天夬 → 泽雷随（归魂）','地雷复（六合）→ 山雷颐（游魂）','雷风恒 → 泽山咸','巽为风（六冲）→ 风天小畜','泽地萃 → 天水讼（游魂）','山水蒙','水风井 → 天风姤','火天大有（归魂）→ 雷风恒','艮为山（六冲）→ 山水蒙']) {
    assert.ok(s.includes(token), token);
  }
});

test('Google daily research respects US-market closed weekends', () => {
  const s = read('lib/data/conviction/google-focus-research-20260808.ts');
  for (const date of ['2026-08-08','2026-08-09','2026-08-15','2026-08-16','2026-08-22','2026-08-23','2026-08-29','2026-08-30']) {
    const i = s.indexOf(`date: "${date}"`);
    assert.ok(i >= 0, date);
    assert.ok(s.slice(i, i + 180).includes('marketState: "CLOSED"'), `${date} should be CLOSED`);
  }
});

test('Google uses a unique router while SNDK keeps the existing sandisk identity', () => {
  const list = read('components/conviction/ConvictionListClient.tsx');
  assert.ok(list.includes('<GoogleWatchlistFeature />'));
  assert.ok(list.includes('<SndkWatchlistFeature />'));

  const detail = read('components/conviction/ConvictionDetailClient.tsx');
  assert.ok(detail.includes('<GoogleDailyResearch />'));
  assert.ok(detail.includes('"sandisk"'));
  assert.ok(!detail.includes('"sndk"'));

  const access = read('lib/data/conviction/access.ts');
  assert.ok(access.includes('listGooglePeriodForecasts'));
  assert.ok(access.includes('listSandiskPeriodForecasts'));
  assert.ok(access.includes('assetId === "googl") return GOOGLE_PERIOD_ORDER'));
  assert.ok(!access.includes('listSndkPeriodForecasts'));
  assert.ok(!access.includes('assetId === "sndk"'));
  assert.ok(!access.includes('assetId === "googl" || assetId === "msft" || assetId === "tencent" || assetId === "kingsoft-office"'));

  const promo = read('components/conviction/SndkWatchlistFeature.tsx');
  assert.ok(promo.includes('href("/featured-stocks/sandisk")'));

  const sandisk = read('lib/data/conviction/sandisk-forecasts.ts');
  for (const token of ['MONTH_3','YEAR_1','YEAR_5']) assert.ok(sandisk.includes(token), token);
});
