import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scenarioAssets, twoWeekNote, illustrationDates, illustrativeBars } from "../content/public-notes/two-week-scenarios-20260929";

test("all nine dated scenarios have traceable real bars and explicitly synthetic future bars",()=>{
  assert.equal(scenarioAssets.length,9);
  assert.equal(twoWeekNote.status,"RESEARCH_ONLY");
  assert.equal(new Set(scenarioAssets.map(a=>a.id)).size,9);
  for(const asset of scenarioAssets){
    assert.equal(asset.zh.length,5); assert.equal(asset.en.length,5);
    assert.ok(asset.source.startsWith("https://"));
    const future=illustrativeBars(asset);
    assert.equal(future.length,illustrationDates(asset.calendar).length);
    assert.ok(asset.history.every(b=>b[0]<=((asset.calendar==="cn"||asset.calendar==="hk")?"2026-09-29":"2026-09-28")));
    for(const b of [...asset.history,...future]){
      assert.ok(b[2]>=Math.max(b[1],b[4]));assert.ok(b[3]<=Math.min(b[1],b[4])); assert.ok(b[3]>0);
    }
    assert.ok(future.every(b=>b[0]>asset.history.at(-1)![0]));
    for(const locale of ["zh","en"]){
      const svg=readFileSync(`public/images/public-notes/20260929/${asset.id}-${locale}.svg`,"utf8");
      assert.equal((svg.match(/data-kind="observed"/g)||[]).length,asset.history.length);
      assert.equal((svg.match(/data-kind="synthetic"/g)||[]).length,future.length);
      assert.match(svg,/SIMULATION|模拟示意/); assert.doesNotMatch(svg,/<script|<foreignObject|NaN|Infinity/);
    }
  }
});
test("market calendars do not fabricate closed-session candles",()=>{
  assert.deepEqual(illustrationDates("cn"),["2026-09-30","2026-10-08","2026-10-09"]);
  assert.ok(!illustrationDates("hk").includes("2026-10-01"));
  assert.ok(illustrationDates("hk").includes("2026-10-02"));
  assert.ok(illustrationDates("crypto").includes("2026-10-04"));
  for(const calendar of ["cn","hk","us"] as const) assert.ok(!illustrationDates(calendar).includes("2026-10-10"));
});
test("public note retains disagreements, failures and editorial boundaries without execution",()=>{
  assert.match(twoWeekNote.zh.integrity,/失误/);assert.match(twoWeekNote.en.integrity,/one-to-three-week/);
  assert.match(twoWeekNote.zh.method,/人工构造/);assert.match(twoWeekNote.en.method,/manually constructed/);
  assert.match(twoWeekNote.zh.provenance,/外部研究/);assert.match(twoWeekNote.zh.disclaimer,/不触发自动交易/);
  const component=readFileSync("components/member/TwoWeekScenarios20260929.tsx","utf8");
  assert.doesNotMatch(component,/useEffect|setInterval|fetch\(|supabase|lib\/bitget|dangerouslySetInnerHTML/);
  assert.match(component,/unoptimized/); assert.match(component,/S6D1oUJ7Qbc/);assert.match(component,/p3P7mKpUIgU/);
  assert.match(readFileSync("components/member/PublicNotes.tsx","utf8"),/<TwoWeekScenarios20260929 en=\{en\}/);
  assert.match(readFileSync("components/community/CreatorHome.tsx","utf8"),/id: twoWeekNote.id/);
});
