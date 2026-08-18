import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const nav = read("config/member-channel-navigation.ts");
const preservedNav = read("config/navigation.ts");
for (const label of ["首页", "新手指南", "历史验证", "会员价格"]) assert.match(nav, new RegExp(`labelZh: \\"${label}\\"`));
assert.match(nav, /会员频道首页/);
for (const label of ["会员日报", "会员周走势预测", "会员月走势预测", "会员周报", "会员专享股票推荐", "会员专享加密货币推荐", "会员缠论数据", "会员量化交易系统", "会员卜卦系统", "山寨币雷达", "多源K线"]) assert.ok(nav.includes(label), label);
assert.match(nav, /experimental: true/);
assert.doesNotMatch(nav.slice(nav.indexOf("PUBLIC_PRIMARY_NAV"), nav.indexOf("PUBLIC_MORE_NAV")), /今日|本周|重点关注|更多/);

for (const route of [
  "app/member/page.tsx",
  "app/member/daily/page.tsx",
  "app/member/weekly-report/page.tsx",
  "app/member/stock-picks/page.tsx",
  "app/member/crypto-picks/page.tsx",
  "app/member/market-structure/page.tsx",
]) assert.ok(exists(route), route);

const home = read("components/home/HomeLandingBoard.tsx");
assert.match(home, /看清方向，等待位置，严格执行/);
assert.match(home, /进入会员频道/);
assert.doesNotMatch(home, /getTomorrowForecastAccessPayload|今日看点|明日看点|奇门主判<\/span>/);

const weekly = read("components/member/MemberWeeklyPage.tsx");
assert.match(weekly, /会员周走势预测/);
assert.doesNotMatch(weekly, /本期方向规则|正式看涨\/看跌方向由六爻主判断/);
const weeklyReport = read("app/member/weekly-report/page.tsx");
assert.match(weeklyReport, /本周先看什么/);
assert.match(weeklyReport, /周走势预测/);

const consultation = read("components/member/MemberConsultationClient.tsx");
for (const token of ["静心60秒", "图案复杂的一面记为“背”", "图案简单的一面记为“字”", "初爻", "上爻", "接收邮箱", "0字 · 3背", "3字 · 0背"]) assert.ok(consultation.includes(token), token);
assert.match(consultation, /allLinesRecorded/);
assert.match(consultation, /linesBottomUp: lines as/);
assert.match(consultation, /待记录/);
const input = read("lib/consultations/input-core.ts");
assert.match(input, /replyEmail/);
assert.match(input, /EMAIL\.test/);
const adminApi = read("app/api/admin/consultations/route.ts");
assert.match(adminApi, /sendRawEmail/);
assert.match(adminApi, /会员中心留档/);
assert.match(adminApi, /emailStatus/);
const adminQueue = read("components/admin/AdminConsultationQueue.tsx");
assert.match(adminQueue, /解答已发送至会员邮箱/);
assert.match(adminQueue, /邮件未发送/);

const keyPerson = read("components/conviction/KeyPersonContextPanel.tsx");
assert.match(keyPerson, /人物周期背离/);
assert.match(keyPerson, /人物周期共振/);
assert.match(keyPerson, /方向保持不变/);
assert.match(keyPerson, /overlappingPeriods/);
const contexts = read("lib/data/key-person-asset-context.ts");
assert.match(contexts, /relatedSlugs: \["tsla", "spcx"\]/);
assert.match(contexts, /2028-01-01/);
assert.doesNotMatch(contexts, /2027.*(?:看涨|上涨|下跌|背离|共振)/);
assert.doesNotMatch(nav, /labelZh: "创始人|labelZh: "关键人物/);

const altcoin = read("app/member/early-altcoin-radar/page.tsx");
assert.match(altcoin, /实验性功能/);
assert.match(altcoin, /不直接触发AI实盘/);
assert.ok(exists("app/member/technical-methods/page.tsx"), "current technical-methods page must be preserved");
assert.ok(exists("app/member/market-structure/page.tsx"), "current or fallback market-structure route must exist");
const memberHub = read("app/member/page.tsx");
assert.match(memberHub, /多源K线/);
assert.match(memberHub, /experimental: true/);

assert.ok(preservedNav.length > 0, "existing config/navigation.ts must remain present");
console.log("MOOX V7.20.4.2 MEMBER CHANNEL IA STATIC REGRESSION PASSED");
