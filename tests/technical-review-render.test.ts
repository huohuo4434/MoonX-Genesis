import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResearchCandleTerminal } from '../components/member/ResearchCandleTerminal';
import type { DailyProjectionData } from '../lib/research/daily-candle-projection-core';
Object.assign(globalThis, { React });
const fixture: DailyProjectionData = {
  assetId:'sandisk',quoteSymbol:'SNDK',source:'Yahoo Finance',timeZone:'America/New_York',stale:false,
  support:null,resistance:null,asOf:'2026-09-14',expectedAsOf:'2026-09-14',projectionDate:'2026-09-15',
  checkedAt:'2026-09-15T10:30:00Z',engine:'technical-first-v5-closed-4h',projections:[],archiveStatus:'NOT_APPLICABLE',archiveId:null,
  bars:Array.from({length:80},(_,i)=>{
    const timestamp=Date.parse('2026-09-14T13:30:00Z')-(79-i)*86400000;
    return {date:new Date(timestamp).toISOString().slice(0,10),timestamp,open:1540,high:1560,low:1505,close:1551.99,volume:100};
  }),
};
test('both languages render the reviewed plan, exact range labels and separate automatic ladder',()=>{
  for(const en of [false,true]) {
    const html=renderToStaticMarkup(React.createElement(ResearchCandleTerminal,{data:fixture,en,band:false}));
    assert.match(html,/data-technical-review="technical-review-20260915-v1"/);
    for(const s of ['1,498','1,517','1,640.95','1,651.23','1,839.74']) assert.ok(html.includes(s));
    assert.match(html,/data-price-level-ladder="v1"/);
    assert.ok(html.includes(en?'No live intraday entry confirmation':'尚未确认实时日内入场条件'));
    assert.ok(html.includes(en?'Meigu Dingfenghu':'美股定风虎'));
  }
});
test('expired and mismatched data never render the active conditional entry summary',()=>{
  for(const data of [{...fixture,checkedAt:'2026-09-16T18:00:00Z'},{...fixture,source:'Other futures'}]) {
    const html=renderToStaticMarkup(React.createElement(ResearchCandleTerminal,{data,en:false,band:false}));
    assert.ok(!html.includes('1498–1517回踩企稳')); assert.ok(!html.includes('T1 ·'));
    assert.match(html,/复核依据与有效期/);
  }
});
