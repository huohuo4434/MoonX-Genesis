import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEY_PERSON_BAZI_POLICY,
  keyPersonBaziCanAffectHorizon,
  keyPersonBaziWeightPct,
} from '@/lib/methodology/key-person-bazi';

test('key-person BaZi never overrides asset direction or daily direction', () => {
  assert.equal(KEY_PERSON_BAZI_POLICY.mayOverrideAssetHexagram, false);
  assert.equal(KEY_PERSON_BAZI_POLICY.mayVoteDailyDirection, false);
  assert.equal(KEY_PERSON_BAZI_POLICY.maySetTechnicalLevels, false);
  assert.equal(keyPersonBaziCanAffectHorizon('WEEK'), false);
  assert.equal(keyPersonBaziCanAffectHorizon('DAY'), false);
  assert.equal(keyPersonBaziCanAffectHorizon('MONTH'), true);
  assert.equal(keyPersonBaziCanAffectHorizon('YEAR_1'), true);
});

test('key-person BaZi requires historical backtest and caps uncertain birth time', () => {
  assert.equal(keyPersonBaziWeightPct({ dataQuality: 'VERIFIED_TIME', historicalBacktestComplete: false }), 0);
  assert.equal(keyPersonBaziWeightPct({ dataQuality: 'TIME_UNKNOWN', historicalBacktestComplete: true }), 5);
  assert.equal(keyPersonBaziWeightPct({ dataQuality: 'TIME_UNCERTAIN', historicalBacktestComplete: true }), 5);
  assert.equal(keyPersonBaziWeightPct({ dataQuality: 'VERIFIED_TIME', historicalBacktestComplete: true }), 10);
});
