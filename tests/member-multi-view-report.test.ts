import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildMultiViewResearcherAlias, filterMultiViewSourceAssets, multiViewVerifiedResearchWeight, redactMultiViewSourceHandles, resolveMultiViewTargetDates, summarizeMultiViewConsensus } from "../lib/research/member-multi-view-core";

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

test("member report contains the ten-day direction heatmap and compact 15-minute health surface",()=>{
  const page=read("app/member/alpha-feed/page.tsx");
  const server=read("lib/trading-signals/member-multi-view.server.ts");
  for(const token of ["资产 × 日期｜观点涨跌热力图","看涨占优","看跌占优","多空打平","10日合计","格内数字=看多票数/看跌票数","观点信号图，不是假装成真实价格K线"])assert.ok(page.includes(token),token);
  assert.match(page,/dates\.map\(\(date/);
  assert.match(page,/\.sort\(\)\.slice\(-10\)/);
  assert.match(page,/查看采集明细/);
  assert.match(page,/展开核心资产共识排行/);
  assert.match(page,/默认全部收起/);
  assert.doesNotMatch(page,/open=\{index < 2\}/);
  assert.doesNotMatch(page,/8月30日 · BTC · 周期分析师看跌/);
  assert.match(page,/与MOOX同向或相反的关系仅会员可见/);
  assert.match(page,/扫描\/汇总 每15分钟/);
  assert.match(server,/reportCronSchedule: "\*\/15 \* \* \* \*"/);
  assert.match(server,/WHERE posted_at >= NOW\(\) - INTERVAL '10 days'/);
});

test("asset-date resolver is exact and never fabricates a medium-horizon day",()=>{
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"MEDIUM",timeWindows:[],summary:"九月整体偏弱"}),[]);
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"SHORT",timeWindows:[],summary:"今日BTC谨慎"}),["2026-08-23"]);
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"MEDIUM",timeWindows:["8月24日至8月26日"],summary:""}),["2026-08-24","2026-08-25","2026-08-26"]);
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"MEDIUM",timeWindows:["2026-08-24至2026-08-26"],summary:""}),["2026-08-24","2026-08-25","2026-08-26"]);
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"MEDIUM",timeWindows:["8月30"],summary:""}),["2026-08-30"]);
  assert.deepEqual(resolveMultiViewTargetDates({postedAt:"2026-08-23T04:00:00Z",horizon:"SHORT",timeWindows:["下周三"],summary:""}),["2026-08-26"]);
});

test("external analyst weight stays zero until enough verified samples",()=>{
  assert.equal(multiViewVerifiedResearchWeight({sampleCount:9,weightedHitRatePct:100}),0);
  assert.equal(multiViewVerifiedResearchWeight({sampleCount:10,weightedHitRatePct:59.9}),0);
  assert.equal(multiViewVerifiedResearchWeight({sampleCount:10,weightedHitRatePct:60}),1);
  assert.equal(multiViewVerifiedResearchWeight({sampleCount:20,weightedHitRatePct:65}),2);
  assert.equal(multiViewVerifiedResearchWeight({sampleCount:30,weightedHitRatePct:70}),3);
});

test("priority analysts stay anonymized inside the asset-date matrix",()=>{
  const page=read("app/member/alpha-feed/page.tsx");
  const registry=read("lib/trading-signals/x-source-registry.server.ts");
  const config=JSON.parse(read("tools/x-collector/default-config.json")) as {accounts:string[]};
  const productionAccounts=read("tools/x-collector/production-accounts.txt").trim().split(/\r?\n/);
  for(const token of ["资产 × 日期｜观点涨跌热力图","看涨占优","看跌占优","同向","相反","少于10个有效验证样本仍为0%权重"]){
    assert.ok(page.includes(token),token);
  }
  assert.doesNotMatch(page,/重点分析师｜一眼对照表/);
  for(const token of ["江恩跨市场分析师","低风险策略分析师","奇门周期分析师","建模趋势分析师","宏观趋势分析师","周期轮动分析师","短线交易分析师","前沿资产分析师","山寨动量分析师"]){
    assert.ok(registry.includes(token),token);
  }
  assert.deepEqual(config.accounts.slice(0,10),["BTCTW0","formnoshape","btcpiggy","yijiangren","laban_li","WallStreet0Name","ximihoo1","KeHenryA8","iiiinvest","coseryaya"]);
  assert.deepEqual(productionAccounts,config.accounts);
  assert.equal(new Set(productionAccounts.map((value)=>value.toLowerCase())).size,productionAccounts.length);
  assert.doesNotMatch(page,/@BTCTW0|@formnoshape|@btcpiggy|@yijiangren|@laban_li|@WallStreet0Name|@ximihoo1|@KeHenryA8|@iiiinvest|@coseryaya/);
  assert.match(page,/value === "上涨" \|\| value === "震荡上涨"/);
  assert.match(page,/value === "下跌" \|\| value === "震荡下跌"/);
  assert.doesNotMatch(page,/value === "先跌后涨"\) return "BULLISH"|value === "先涨后跌"\) return "BEARISH"/);
  const memberServer=read("lib/trading-signals/member-multi-view.server.ts");
  assert.match(memberServer,/redactMemberSourceHandles/);
  assert.match(memberServer,/summarizeMultiViewForAsset\(memberSafeText/);
  const configure=read("tools/x-collector/configure.ps1");
  assert.doesNotMatch(configure,/Sort-Object -Unique/);
  assert.match(configure,/production-accounts\.txt/);
  assert.match(configure,/requiredAccounts \+ \$existingAccounts/);
  for(const handle of productionAccounts){
    for(const sample of [`${handle}认为BTC看涨，目标78000。`,`@${handle} BTC看涨。`,`https://x.com/${handle} BTC看涨。`,`${handle.toUpperCase()} says BTC bullish.`]){
      assert.doesNotMatch(redactMultiViewSourceHandles(sample,productionAccounts),new RegExp(handle,"i"),`${handle}: ${sample}`);
    }
  }
  assert.deepEqual(filterMultiViewSourceAssets(["BTC","$KeHenryA8","BTCTW0","ETH"],productionAccounts),["BTC","ETH"]);
  assert.match(memberServer,/assetsForRow\(row, memberSafeText\)/);
  assert.match(memberServer,/filterMultiViewSourceAssets\(parsed\.symbols\.map\(String\), MEMBER_SOURCE_HANDLES\)/);
});
