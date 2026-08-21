import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildMultiViewResearcherAlias, summarizeMultiViewConsensus } from "../lib/research/member-multi-view-core";

const root=path.resolve(import.meta.dirname,"..");
const read=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");

test("member aliases describe method without exposing monitored identities",()=>{
  assert.equal(buildMultiViewResearcherAlias("研究者 4381",[{theory:"江恩"}]),"江恩分析师 4381");
  assert.equal(buildMultiViewResearcherAlias("研究者 6420",[{theory:"缠论"}]),"缠论分析师 6420");
  const page=read("app/member/alpha-feed/page.tsx");
  assert.match(page,/buildMultiViewResearcherAlias/);
  assert.doesNotMatch(page,/@[A-Za-z0-9_]{2,30}|打开原帖|Open original post/);
});

test("consensus separates direction strength and sample size",()=>{
  assert.deepEqual(summarizeMultiViewConsensus({bullish:3,bearish:1,mixed:0,neutral:0}),{direction:"BULLISH",percent:75,sampleSize:4});
  assert.deepEqual(summarizeMultiViewConsensus({bullish:2,bearish:2,mixed:0,neutral:0}),{direction:"MIXED",percent:50,sampleSize:4});
  assert.deepEqual(summarizeMultiViewConsensus({bullish:0,bearish:0,mixed:0,neutral:0}),{direction:"NEUTRAL",percent:0,sampleSize:0});
});

test("member report contains the large asset table and 15-minute health surface",()=>{
  const page=read("app/member/alpha-feed/page.tsx");
  const server=read("lib/trading-signals/member-multi-view.server.ts");
  for(const token of ["核心资产共识总表","当前占优","共识强度","观点分布","主要方法","观点变化"])assert.ok(page.includes(token),token);
  assert.match(page,/扫描\/汇总 每15分钟/);
  assert.match(server,/reportCronSchedule: "\*\/15 \* \* \* \*"/);
  assert.match(server,/WHERE posted_at >= NOW\(\) - INTERVAL '10 days'/);
});
