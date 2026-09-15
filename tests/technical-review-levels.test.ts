import assert from 'node:assert/strict';
import test from 'node:test';
import { technicalReviewFor, TECHNICAL_REVIEW } from '../lib/research/technical-review-levels';

const now = Date.parse('2026-09-15T10:30:00Z');
function quote(assetId = 'sandisk', quoteSymbol = 'SNDK', close = 1551.99) {
  return { assetId, quoteSymbol, source: 'Yahoo Finance', timeZone: 'America/New_York', stale: false,
    checkedAt: new Date(now).toISOString(), bars: [{ date: '2026-09-14', timestamp: Date.parse('2026-09-14T13:30:00Z'),
      open: close, high: close + 1, low: close - 1, close, volume: 100 }] };
}
test('only matched supported equity symbols receive dated review overlays', () => {
  for (const [id, symbol, close] of [['sandisk','SNDK',1551.99],['lite','LITE',835.03],['msft','MSFT',505.41]] as const) {
    const r = technicalReviewFor(quote(id, symbol, close), now)!;
    assert.equal(r.status, 'ACTIVE'); assert.ok(r.chartZones.length >= 4);
    assert.equal(r.condition, 'WAIT_CONFIRMATION');
  }
  for (const id of ['btc','gold','tsem','tem','spcx']) assert.equal(technicalReviewFor(quote(id), now), null);
  assert.equal(technicalReviewFor(quote('sandisk', 'SNDKUSDT'), now), null);
});
test('SNDK exact source zones and new target are preserved', () => {
  const r = technicalReviewFor(quote(), now)!;
  assert.deepEqual(r.chartZones.map(z => [z.low,z.high]), [[1498,1517],[1436.15,1460.19],[1293.70,1308.95],[1640.95,1651.23],[1839.74,1839.74]]);
});
test('CFD, futures, adjusted prices and missing reference date fail closed', () => {
  for (const q of [{...quote(), source:'CFD'}, {...quote(),timeZone:'UTC'},quote('sandisk','SNDK',155.199), {...quote(),bars:[]}]) {
    const r = technicalReviewFor(q, now)!; assert.equal(r.status,'BASIS_MISMATCH'); assert.deepEqual(r.chartZones,[]);
  }
});
test('stale data, invalid and future timestamps do not retain current chart lines', () => {
  for (const q of [{...quote(),stale:true}, {...quote(),checkedAt:'invalid'}, {...quote(),checkedAt:new Date(now+120000).toISOString()}]) {
    assert.deepEqual(technicalReviewFor(q,now)!.chartZones,[]);
  }
  assert.deepEqual(technicalReviewFor(quote(),now+16*60000)!.chartZones,[]);
  assert.deepEqual(technicalReviewFor(quote(),NaN)!.chartZones,[]);
});
test('review expiry and pre-publication gates preserve record but remove current lines', () => {
  const expiry = Date.parse(TECHNICAL_REVIEW.reviewBy);
  const q = {...quote(),checkedAt:new Date(expiry).toISOString()};
  assert.equal(technicalReviewFor(q,expiry)!.status,'EXPIRED');
  assert.deepEqual(technicalReviewFor(q,expiry)!.chartZones,[]);
  assert.ok(technicalReviewFor(q,expiry)!.zones.length);
  const before=Date.parse(TECHNICAL_REVIEW.availableFrom)-1;
  assert.deepEqual(technicalReviewFor({...quote(),checkedAt:new Date(before).toISOString()},before)!.chartZones,[]);
});
test('latest close updates broken-support and reached-objective messages without revising old candles', () => {
  const q=quote(); const original=JSON.stringify(q);
  for (const [close,expected] of [[1490,'BELOW_WATCH'],[1645,'AT_OBJECTIVE']] as const) {
    const changed={...q,bars:[...q.bars,{...q.bars[0]!,date:'2026-09-15',close}]};
    assert.equal(technicalReviewFor(changed,now)!.condition,expected);
  }
  assert.equal(JSON.stringify(q),original);
});
test('ordered positive finite zones and bilingual labels, no claimed execution authority', () => {
  for (const [id,symbol,close] of [['sandisk','SNDK',1551.99],['lite','LITE',835.03],['msft','MSFT',505.41]] as const) {
    const r=technicalReviewFor(quote(id,symbol,close),now)!;
    for(const z of r.zones) { assert.ok(Number.isFinite(z.high)&&z.low>0&&z.high>=z.low); assert.ok(z.label.en&&z.label.zh); }
    assert.ok(r.summary.en&&r.summary.zh); assert.ok(!('tradeAuthority' in r));
  }
});
