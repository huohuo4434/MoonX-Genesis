import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,PUBLIC_INTERPRETATION_LABEL_EN,PUBLIC_INTERPRETATION_LABEL_ZH,PUBLIC_MARKET_VIEW_LABEL_EN,PUBLIC_MARKET_VIEW_LABEL_ZH,projectAttributionForAudience,projectPublicAttribution,projectPublicResearchRadar,publicAttributionText } from "../lib/presentation/public-attribution";
import { WEEKLY_ALPHA_20260810_BASE } from "../lib/data/weekly-alpha-20260810";

const root=path.resolve(import.meta.dirname,"..");
const read=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");
const denied=/@[A-Za-z0-9_]+|\b(?:MAT78704|BTCTW0|BTCKIK|Stone|NANA|WOLF|GAOSHAN)\b|teacher(?:-supplied| claim)?|external analyst|public analyst|乔乔|狼叔|高山说缠论|老师主张|MOOX验证某人/i;

test("public projection recursively removes private provenance and external identities",()=>{
  const projected=projectPublicAttribution({title:"Stone + @mat78704 + NANA",postUrl:"https://x.test",rawExcerpt:"raw",sourceArtifact:"secret.zip",nested:{relativePath:"private/a.txt",sourceIds:["WOLF"],safe:"BTCTW0 says watch"}});
  const serialized=JSON.stringify(projected);assert.doesNotMatch(serialized,denied);for(const key of ["postUrl","rawExcerpt","sourceArtifact","relativePath","sourceIds"])assert.ok(!serialized.includes(key));assert.match(serialized,/易老师综合解读/);
});
test("member radar DTO renames the private external framework key before serialization",()=>{const projected=projectPublicResearchRadar({stone:{role:"Stone framework",sourceClaims:["NANA"],mooxInterpretation:[],frameworkChain:[],verificationNote:""},qimenRole:"timing"});const serialized=JSON.stringify(projected);assert.ok(!Object.hasOwn(projected,"stone"));assert.ok(Object.hasOwn(projected,"macroLiquidity"));assert.doesNotMatch(serialized,denied);});
test("brand policy is explicit and never implies historical personal review",()=>{assert.equal(PUBLIC_INTERPRETATION_LABEL_ZH,"易老师综合解读");assert.equal(PUBLIC_MARKET_VIEW_LABEL_ZH,"易老师市场研判");assert.match(PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,/传统术数.*技术结构.*宏观事件.*新闻.*公开市场信息.*AI仅辅助/);assert.doesNotMatch(PUBLIC_ATTRIBUTION_DISCLOSURE_ZH,/复核.*已完成/);});
test("member and public API serialization routes apply the shared projection",()=>{for(const file of ["app/api/member/stocks/[symbol]/route.ts","app/api/member/spcx-research/route.ts","app/api/forecasts/weekly/route.ts","app/api/accuracy/weekly/route.ts","lib/data/public-research.ts"])assert.match(read(file),/projectPublicAttribution|projectAttributionForAudience/);});
test("covered member render surfaces hide raw excerpts artifacts paths and external marketing labels",()=>{const files=["app/member/weekly/page.tsx","components/member/MemberWeeklyPage.tsx","components/member/WeeklyAlphaFive.tsx","components/member/MemberQimenStoneRadar.tsx","app/member/technical-methods/page.tsx","components/member/TeacherMethodRulebookPanel.tsx","app/member/early-altcoin-radar/page.tsx","app/member/alpha-feed/page.tsx","components/member/MemberFounderCyclePage.tsx","components/conviction/FocusDossierPanel.tsx","components/home/WeeklyForecastClient.tsx","components/home/HomeAccuracySummary.tsx"];const source=files.map(read).join("\n");for(const leak of ["item.postExcerptZh","artifact.name","item.relativePath","老师主张","乔乔","NANA宏观期权","Stone ·"])assert.ok(!source.includes(leak),leak);assert.match(source,/易老师综合解读|PUBLIC_INTERPRETATION_LABEL_ZH/);});
test("internal provenance remains available and trading modules are untouched",()=>{assert.match(read("lib/data/member-qimen-stone-radar-20260814.ts"),/Stone/);assert.match(read("lib/data/teacher-method-rulebook-20260815.ts"),/relativePath/);assert.doesNotMatch(read("lib/presentation/public-attribution.ts"),/lib\/bitget|trading-signals|placeOrder|submitOrder/);});

test("public projection preserves Date contracts and uses a strict provenance-key policy",()=>{
  const capturedAt=new Date("2026-08-15T01:02:03.000Z");
  const fixture={
    capturedAt,
    postExcerptZh:"private excerpt",
    sourceUrls:["https://private.invalid"],
    artifactPath:"private/archive.zip",
    sourceLabelZh:"private teacher",
    sourceLabelEn:"private teacher",
    sourceType:"private-teacher",
    safe:"public summary",
  };
  const projected=projectPublicAttribution(fixture);
  assert.equal(projected.capturedAt,capturedAt.toISOString());
  assert.equal(projected.sourceLabelZh,PUBLIC_INTERPRETATION_LABEL_ZH);
  assert.equal(projected.sourceLabelEn,PUBLIC_INTERPRETATION_LABEL_EN);
  assert.equal(projected.sourceType,"PUBLIC_MARKET_RESEARCH");
  assert.deepEqual(Object.keys(projected).sort(),["capturedAt","safe","sourceLabelEn","sourceLabelZh","sourceType"].sort());
});

test("real-shaped Early Altcoin and SPCX responses retain required labels but remove raw provenance",()=>{
  const early=projectPublicAttribution({
    symbol:"PENGUUSDT",sourceLabelZh:"BTCKIK",sourceType:"ALTCOIN_DISCOVERY",
    postExcerptZh:"raw post",postUrl:"https://x.invalid/post",artifactPath:"private/file.txt",
    observedAt:new Date("2026-08-15T02:00:00.000Z"),
  });
  assert.deepEqual(early,{symbol:"PENGUUSDT",sourceLabelZh:PUBLIC_INTERPRETATION_LABEL_ZH,sourceType:"PUBLIC_MARKET_RESEARCH",observedAt:"2026-08-15T02:00:00.000Z"});
  const spcx=projectPublicAttribution({sourceLabelZh:"private",sourceLabelEn:"private",sourceUrl:"https://private.invalid",artifactPath:"private/spcx.txt",summaryZh:"safe",summaryEn:"safe"});
  assert.equal(spcx.sourceLabelZh,PUBLIC_INTERPRETATION_LABEL_ZH);
  assert.equal(spcx.sourceLabelEn,PUBLIC_INTERPRETATION_LABEL_EN);
  assert.ok(!("sourceUrl" in spcx));
  assert.ok(!("artifactPath" in spcx));
});

test("locale-aware labels never mix Chinese attribution into English output",()=>{
  const projected=projectPublicAttribution({sourceLabel:"private",sourceType:"private-teacher",summary:"NANA market view"},{locale:"en"});
  assert.equal(projected.sourceLabel,PUBLIC_INTERPRETATION_LABEL_EN);
  assert.equal(projected.sourceType,"PUBLIC_MARKET_RESEARCH");
  assert.match(projected.summary,/Yi interpretation/);
  assert.doesNotMatch(projected.summary,/易老师/);
  assert.equal(PUBLIC_MARKET_VIEW_LABEL_EN,"Yi market view");
});

test("audience projection preserves admin provenance and sanitizes the same member payload",()=>{
  const payload={sourceIds:["internal-1"],sourceLabel:"BTCTW0",postExcerptZh:"raw",value:1};
  const admin=projectAttributionForAudience(payload,{audience:"ADMIN",locale:"en"});
  assert.strictEqual(admin,payload);
  assert.deepEqual(admin.sourceIds,["internal-1"]);
  const member=projectAttributionForAudience(payload,{audience:"MEMBER",locale:"en"});
  assert.ok(!("sourceIds" in member));
  assert.ok(!("postExcerptZh" in member));
  assert.equal(member.sourceLabel,PUBLIC_INTERPRETATION_LABEL_EN);
});

test("member stock route selects admin passthrough only from the authoritative payload flag",()=>{
  const source=read("app/api/member/stocks/[symbol]/route.ts");
  assert.match(source,/audience:\s*payload\.isAdmin\s*\?\s*"ADMIN"\s*:\s*"MEMBER"/);
  assert.match(source,/projectAttributionForAudience/);
});

test("canonical key filtering rejects snake case and a real StoredPostRow shape",()=>{
  const storedPostRow={
    user_name:"private_handle",
    post_id:"1890000000000000000",
    post_url:"https://private.invalid/post",
    posted_at:new Date("2026-08-15T03:00:00.000Z"),
    text:"raw private post",
    parsed:{raw_text:"private",post_text:"private",source_ids:["private"]},
    internal_source_ref:"private-ref",
    safeSummary:"public summary",
  };
  const projected=projectPublicAttribution(storedPostRow);
  assert.deepEqual(projected,{posted_at:"2026-08-15T03:00:00.000Z",safeSummary:"public summary"});
  const variants=projectPublicAttribution({rawPost:"x",raw_text:"x",postText:"x",post_id:"x",internal_source_ref:"x",source_ids:["x"],userName:"x",safe:true});
  assert.deepEqual(variants,{safe:true});
});

test("admin-only and admin-capable consumers preserve internal provenance only for admins",()=>{
  const longTerm=read("app/research/long-term/page.tsx");
  assert.match(longTerm,/requireAdminOrNotFound/);
  assert.doesNotMatch(longTerm,/projectPublicAttribution|projectAttributionForAudience/);
  const spcx=read("app/api/member/spcx-research/route.ts");
  assert.match(spcx,/audience:\s*access\.isAdmin\s*\?\s*"ADMIN"\s*:\s*"MEMBER"/);
  assert.match(spcx,/projectAttributionForAudience/);
});

test("real founder and weekly packs are fully presentation-safe before member rendering",()=>{
  const founder=read("lib/data/member-founder-cycle-20260814.ts");
  const weekly=read("lib/data/weekly-alpha-20260810.ts");
  const zh=publicAttributionText(`${founder}\n${weekly}`,"zh");
  const en=publicAttributionText(`${founder}\n${weekly}`,"en");
  for(const phrase of ["老师提供","老师法","老师笔记","外部同周期六爻","teacher-supplied","teacher method","teacher-method review","teacher notes"]){
    assert.ok(!zh.toLowerCase().includes(phrase.toLowerCase()),phrase);
    assert.ok(!en.toLowerCase().includes(phrase.toLowerCase()),phrase);
  }
  assert.match(read("components/member/MemberFounderCyclePage.tsx"),/projectPublicAttribution\(rawPack,\s*\{\s*locale\s*\}\)/);
  assert.match(read("app/member/weekly/page.tsx"),/projectPublicAttribution\(await buildWeeklyAlphaIssue/);
});

test("alpha report projection sanitizes every nested display string",()=>{
  const report=projectPublicAttribution({
    marketConclusionZh:"老师笔记复核版：观察",
    topActionsZh:["老师法复核后：等待"],
    assets:[{finalConclusionZh:"外部同周期六爻只作参考",reasonsZh:["老师提供"]}],
  });
  assert.doesNotMatch(JSON.stringify(report),/老师提供|老师法|老师笔记|外部同周期六爻/);
  assert.match(read("app/member/alpha-feed/page.tsx"),/report = projectPublicAttribution/);
});

test("public DTO renames teacher-specific fields and normalizes status tokens",()=>{
  const projected=projectPublicAttribution({
    teacherInterpretation:[{zh:"老师法复核后：保留事实",en:"After teacher-method review, retain facts"}],
    teacherClaim:{zh:"老师待验证预测",en:"unverified teacher prediction"},
    verificationStatus:"TEACHER_CLAIM_PENDING",
  });
  assert.ok(!("teacherInterpretation" in projected));
  assert.ok(!("teacherClaim" in projected));
  assert.match(projected.methodInterpretation[0]!.zh,new RegExp(PUBLIC_INTERPRETATION_LABEL_ZH));
  assert.match(projected.methodInterpretation[0]!.en,new RegExp(PUBLIC_INTERPRETATION_LABEL_EN));
  assert.equal(projected.researchMaterialSummary.zh,`${PUBLIC_INTERPRETATION_LABEL_ZH}待验证预测`);
  assert.equal(projected.verificationStatus,"SOURCE_CLAIM_PENDING");
  assert.doesNotMatch(JSON.stringify(projected),/teacher|老师法|老师笔记|外部同周期六爻/i);
});

test("complete Weekly Alpha client payload contains no provenance IDs at any depth",()=>{
  const clientProp=projectPublicAttribution(WEEKLY_ALPHA_20260810_BASE,{locale:"zh"});
  const leakedKeys:string[]=[];
  const visit=(value:unknown,path:string)=>{
    if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${path}[${index}]`));return;}
    if(!value||typeof value!=="object")return;
    for(const [key,item] of Object.entries(value as Record<string,unknown>)){
      const canonical=key.replace(/[^A-Za-z0-9]/g,"").toLowerCase();
      if(/sourceids?$/.test(canonical)||/^(?:postid|posturl|username|internalsourceref)$/.test(canonical))leakedKeys.push(`${path}.${key}`);
      visit(item,`${path}.${key}`);
    }
  };
  visit(clientProp,"weeklyAlpha");
  assert.deepEqual(leakedKeys,[]);
  const serialized=JSON.stringify(clientProp);
  assert.doesNotMatch(serialized,/auditSourceIds|audit_source_ids|forecastSourceId|sourceIds/i);
  for(const entry of clientProp.entries)assert.ok(!("auditSourceIds" in entry));
});
