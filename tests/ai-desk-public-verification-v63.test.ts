import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

test("会员AI交易台先开页面再异步读取快照", () => {
  const page = read("app/member/ai-trading/page.tsx");
  const lazy = read("components/member/MemberAiTradingDashboardLazy.tsx");
  const client = read("components/member/AiTradingDeskClient.tsx");
  const api = read("app/api/member/ai-trading-desk/route.ts");
  assert.match(page, /MemberAiTradingDashboardLazy/);
  assert.doesNotMatch(page, /await getMemberAiTradingDeskSnapshot/);
  assert.match(lazy, /fetch\("\/api\/member\/ai-trading-desk"/);
  assert.match(lazy, /AiTradingDeskClient initial=\{snapshot\}/);
  assert.match(client, /startMemberDeskPolling/);
  assert.match(client, /30_000/);
  const polling = read("lib/member-ai-desk-polling-core.ts");
  assert.match(polling, /AbortController/);
  assert.match(polling, /refresh\(\);/);
  assert.match(polling, /currentGeneration !== generation/);
  assert.match(api, /getCachedMemberAiTradingDeskSnapshot/);
  assert.match(api, /snapshot-only/);
});

test("会员读取路径不再执行建表和完整Bitget同步", () => {
  const desk = read("lib/trading-signals/member-ai-trading-desk.ts");
  const start = desk.indexOf("export async function getMemberAiTradingDeskSnapshot");
  assert.ok(start >= 0);
  const reader = desk.slice(start);
  assert.doesNotMatch(reader, /ensureMemberAiTradingDeskTables/);
  assert.doesNotMatch(reader, /syncMemberAiTradingDeskSnapshot\(/);
  assert.match(reader, /withReadTimeout/);
  assert.match(reader, /lastReadableSnapshot/);
});

test("公开验证读取去重、超时并保留最近可读数据", () => {
  const store = read("lib/data/moonx-data-store.ts");
  assert.match(store, /jsonReadCache/);
  assert.match(store, /jsonReadInflight/);
  assert.match(store, /withStorageTimeout/);
  const start = store.indexOf("async function readJsonFile");
  const end = store.indexOf("async function writeJsonFile", start);
  const reader = store.slice(start, end);
  assert.doesNotMatch(reader, /ensureDataBucket\(/);
  assert.match(reader, /cached\?\.value/);
});

test("公开验证API包含星级分档、趋势分析和公共缓存", () => {
  const api = read("app/api/public/verification/route.ts");
  const client = read("components/verification/DailyAccuracyClient.tsx");
  assert.match(api, /starBreakdown/);
  assert.match(api, /starTrend/);
  assert.match(api, /s-maxage=60/);
  assert.match(client, /1星至5星分别公开统计/);
  assert.match(client, /目前高星是否真的更准/);
  assert.match(client, /有效的命中和未命中都会保留/);
});


test("每日验证单个资产和附属任务失败不会拖垮整批", () => {
  const runner = read("lib/verification/run-daily.ts");
  const cron = read("app/api/cron/verify-daily/route.ts");
  const lateCron = read("app/api/cron/verify-daily-late/route.ts");
  assert.match(runner, /for \(let forecast of candidates\)[\s\S]*?try \{/);
  assert.match(runner, /report\.errors\.push/);
  assert.match(cron, /Promise\.allSettled/);
  assert.match(lateCron, /Promise\.allSettled/);
  assert.match(cron, /vercel-cron\/1\.0/);
  assert.match(lateCron, /vercel-cron\/1\.0/);
  assert.match(cron, /Cache-Control.*no-store/);
  assert.match(lateCron, /Cache-Control.*no-store/);
});
