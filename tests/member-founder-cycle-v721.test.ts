import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { founderCycleAccessAction } from "../lib/data/member-founder-cycle-access-core";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const route = read("app/member/founder-cycle/page.tsx");
const data = read("lib/data/member-founder-cycle-20260814.ts");
const types = read("types/member-founder-cycle.ts");
const component = read("components/member/MemberFounderCyclePage.tsx");

test("founder cycle route enforces login membership and device before loading the private pack", () => {
  assert.match(route, /getMemberDevicePageAccess\(\)/);
  assert.equal(founderCycleAccessAction("LOGIN_REQUIRED"), "REDIRECT_LOGIN");
  assert.equal(founderCycleAccessAction("MEMBERSHIP_REQUIRED"), "REDIRECT_MEMBERSHIP");
  assert.equal(founderCycleAccessAction("DEVICE_REQUIRED"), "RENDER_DEVICE_GATE");
  assert.equal(founderCycleAccessAction("ALLOWED"), "LOAD_PRIVATE_PACK");
  assert.match(route, /REDIRECT_LOGIN[\s\S]*redirect\(`\/login\?next=\$\{path\}`\)/);
  assert.match(route, /REDIRECT_MEMBERSHIP[\s\S]*redirect\("\/account\/membership"\)/);
  assert.match(route, /RENDER_DEVICE_GATE[\s\S]*MemberDeviceGate/);
  assert.match(route, /guardMemberForecastRoute\(\)/);
  assert.doesNotMatch(route, /^import .*member-founder-cycle-20260814/m);
  const deviceReturn = route.indexOf('if (action === "RENDER_DEVICE_GATE")');
  const dynamicPack = route.indexOf('import("@/lib/data/member-founder-cycle-20260814")');
  assert.ok(deviceReturn >= 0 && dynamicPack > deviceReturn);
  assert.match(route.slice(0, dynamicPack), /REDIRECT_LOGIN/);
  assert.match(route.slice(0, dynamicPack), /REDIRECT_MEMBERSHIP/);
});

test("private pack preserves evidence status and separates teacher claims from MOOX interpretation", () => {
  assert.match(data, /import "server-only"/);
  assert.match(data, /sourceArtifact: "黄仁勋马斯克\.zip"/);
  assert.match(data, /sourcePublishedAt: null/);
  assert.match(data, /verificationStatus: "UNVERIFIED_SOURCE_CLAIM"/);
  assert.match(data, /verificationStatus: "TEACHER_CLAIM_PENDING"/);
  assert.match(data, /executionAuthority: "RESEARCH_ONLY"/);
  assert.match(data, /consensusEligible: false/);
  assert.match(data, /tradingEligible: false/);
  assert.match(types, /teacherClaim: LocalizedText/);
  assert.match(types, /mooxInterpretation: LocalizedText/);
  assert.doesNotMatch(data, /@\/lib\/trading-signals|@\/lib\/bitget|submitOrder|executeReadyDecision/);
});

test("pack contains exactly the two supplied cases and all supplied timing windows as pending claims", () => {
  assert.equal((data.match(/id: "JENSEN_HUANG"/g) ?? []).length, 1);
  assert.equal((data.match(/id: "ELON_MUSK"/g) ?? []).length, 1);
  for (const evidence of ["癸卯 / 甲寅 / 辛卯 / 丙申", "1963-02-17 16:00", "辛亥 / 甲午 / 甲申 / 丁卯", "2026 年 8月至10月", "2026年11月至2027年1月", "2027 丁未", "约 4 月", "2028 戊申", "自由落体"]) assert.ok(data.includes(evidence), evidence);
  assert.match(data, /天机化忌/);
  assert.match(data, /缺一项即保持未验证/);
  for (const evidence of ["辛金、财多身弱", "己土、丑土", "癸水可用", "壬水过多不利", "1993 年创立公司", "1999 年上市", "2001 辛巳年的强上涨表现作为正向回验样本", "年份未提供的“壬水与火组合不利”负向样本", "不把未提供年份的样本写成壬午年", "不补造最大跌幅", "公司八字拟合较差", "周线顶背离确认", "2027 丁未与换运叠加", "2028 戊申叠加紫微换大限", "财帛宫天机化忌", "甲木为日主", "甲申坐七杀", "丁卯为根", "母亲对应印星", "来源依据、命局组合依据、历史事件验证三项齐全", "拒绝“机月同梁”候选", "酉冲卯可能对应政治风险", "壬辰的七杀结构对应早期创业", "辛卯的伤官见官与羊刃", "子女、婚姻、创业压力及接近破产", "庚寅的七杀回验事业扩张", "NASA 或 SpaceX 恢复", "家庭波动属于不同验证维度", "TSLA 仍可能有转机"]) assert.ok(data.includes(evidence), evidence);
  assert.equal((data.match(/id: "jensen-history-2001-positive"/g) ?? []).length, 1);
  assert.equal((data.match(/id: "jensen-history-undated-negative"/g) ?? []).length, 1);
  assert.doesNotMatch(data, /2001[^\n]{0,220}(?:反向回验|negative backtest)/i);
  assert.match(data, /必须各自寻找来源并分别评分/);
  assert.match(data, /必须分别评估，不合并为一个成功率/);
  assert.match(data, /首批结构化档案，依据当前上传包；后续可追加，但不事后改写本次版本/);
});

test("page is bilingual mobile-readable and score is display-only", () => {
  assert.match(component, /locale: "zh" \| "en"/);
  assert.match(component, /sm:grid-cols-2/);
  assert.match(component, /sm:p-8/);
  assert.match(component, /Teacher claim/);
  assert.match(component, /老师主张/);
  assert.match(component, /DISPLAY ONLY/);
  assert.match(data, /status: "MOOX_PROVISIONAL"/);
  assert.match(data, /displayOnly: true/);
  assert.match(data, /reviewThreshold: 75/);
  assert.match(types, /reviewThreshold: 75/);
  assert.match(data, /阈值 75 源自本次网页 AI 整理建议/);
  assert.doesNotMatch(data, /min: 70/);
});

test("change introduces no API database environment or trading integration", () => {
  const combined = [route, data, types, component].join("\n");
  assert.doesNotMatch(combined, /process\.env|prisma|\$queryRaw|\$executeRaw|app\/api|trading-signals|bitget/i);
  assert.match(read("app/member/technical-methods/page.tsx"), /href="\/member\/founder-cycle"/);
  const account = read("components/account/AccountPageClient.tsx");
  assert.match(account, /isActiveMember[\s\S]*href="\/member\/founder-cycle"/);
});
