import test from 'node:test';
import assert from 'node:assert/strict';
import { loadKeyDateDaily } from '../lib/market-data/key-date-daily.server';
test('actual loader returns only observed candles plus separate sources for each crypto asset', async t => {
  const now = Date.parse('2026-09-27T09:00Z');
  const rows = Array.from({ length: 100 }, (_, i) => [Date.parse('2026-09-26') - (99 - i) * 86400000, 80000 + i, 80500 + i, 79500 + i, 80200 + i, 100]);
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => { urls.push(String(url)); return Response.json(String(url).includes('okx.com') ? { code: '0', data: rows.map(row => [...row, 0, 0, '1']) } : rows); });
  for (const asset of ['btc', 'eth', 'sol', 'hype']) {
    const data = await loadKeyDateDaily(asset, now);
    assert.equal(data.bars.at(-1)?.close, 80299);
    assert.deepEqual(data.projections, []);
    assert(data.research?.records.every(r => r.assetId === asset));
    assert.equal(data.archiveStatus, 'NOT_APPLICABLE');
    assert.equal(!!data.editorialContext, asset === 'btc');
  }
  assert(urls.every(url => !/4h|order|account|supabase/i.test(url)));
});
