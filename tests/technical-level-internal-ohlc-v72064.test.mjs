import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.env.MOOX_PROJECT_ROOT || process.cwd();
const rel = 'lib/market-data/technical-price-structure.ts';
const source = fs.readFileSync(path.join(root, rel), 'utf8');

assert.match(source, /MOOX_V72064_INTERNAL_OHLC_FALLBACK/);
assert.match(source, /listDailyVerificationResults/);
assert.match(source, /fetchVerifiedDailyBars/);
assert.match(source, /actualHigh/);
assert.match(source, /actualLow/);
assert.match(source, /actualClose/);
assert.match(source, /moox-verified-ohlc/);
assert.match(source, /fetchVerifiedDailyBars\(input\.symbol, input\.asOfDate\)/);
assert.doesNotMatch(source, /high:\s*close|low:\s*close/);
console.log('MOOX V7.20.6.4 INTERNAL VERIFIED OHLC FALLBACK REGRESSION PASSED');
