import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('public history is gated by actual verifiedAt, not calendar rollover alone', () => {
  const source = read('lib/accuracy/public-history-filter.ts');
  assert.match(source, /const now = input\.now \?\? new Date\(\)/);
  assert.match(source, /new Date\(r\.verifiedAt\)\.getTime\(\)/);
  assert.match(source, /verifiedAtMs > now\.getTime\(\)/);
  assert.match(source, /r\.forecastDate > todayKey/);
  assert.doesNotMatch(source, /r\.forecastDate < todayKey/);
});

test('verification regression explicitly tests before and after verifiedAt', () => {
  const source = read('tests/public-accuracy-history.test.ts');
  assert.match(source, /publication follows verifiedAt, not the Beijing calendar rollover/);
  assert.match(source, /afterMidnightBeforeVerification/);
  assert.match(source, /afterVerification/);
  assert.match(source, /same-day terminal verification never leaks before verifiedAt/);
});
