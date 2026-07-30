/**
 * Seed Master Intelligence baseline — writes JSON store directly (CLI-safe).
 */
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const LOCAL_FILE = resolve(process.cwd(), "data", "master-intelligence.json");

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

type Store = {
  version: 1;
  updatedAt: string;
  lessons: unknown[];
  transcripts: unknown[];
  extractions: unknown[];
  candidates: unknown[];
  ruleTree: unknown[];
  nodes: unknown[];
  edges: unknown[];
  conflicts: unknown[];
  marketWeights: unknown[];
  publishedRules: unknown[];
  publishedCases: unknown[];
};

function empty(): Store {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    lessons: [],
    transcripts: [],
    extractions: [],
    candidates: [],
    ruleTree: [],
    nodes: [],
    edges: [],
    conflicts: [],
    marketWeights: [],
    publishedRules: [],
    publishedCases: [],
  };
}

function load(): Store {
  try {
    if (!existsSync(LOCAL_FILE)) return empty();
    return { ...empty(), ...(JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as Store), version: 1 };
  } catch {
    return empty();
  }
}

const RULES = [
  { code: "Rule0001", title: "投资预测先定用神", text: "投资预测先定用神，用神不明则判断无效。" },
  { code: "Rule0002", title: "妻财代表价格", text: "妻财代表价格与标的价值变动。" },
  { code: "Rule0003", title: "兄弟持世", text: "兄弟持世需结合财旺、伏神与月建综合判断资金分流。" },
  { code: "Rule0004", title: "财伏藏", text: "财伏藏时常提示上涨动力不足或资金被压制。" },
  { code: "Rule0005", title: "官鬼代表风险", text: "官鬼代表风险、压力与监管扰动。" },
  { code: "Rule0006", title: "子孙制鬼", text: "子孙制鬼可缓解风险，利于风险资产弹性。" },
  { code: "Rule0007", title: "父母代表消息", text: "父母代表消息、政策与信息冲击。" },
  { code: "Rule0008", title: "月破判断", text: "月破需降权或等待出破窗口再定方向。" },
  { code: "Rule0009", title: "化退判断", text: "化退提示动能减弱，警惕冲高回落或震荡下跌。" },
  { code: "Rule0010", title: "时间窗口判断", text: "时间窗口与应期必须单独验证，不可与方向混为一谈。" },
];

const store = load();
const now = new Date().toISOString();

for (const r of RULES) {
  const existing = (store.publishedRules as Array<{ ruleCode: string }>).find((x) => x.ruleCode === r.code);
  if (existing) continue;
  (store.publishedRules as unknown[]).push({
    id: newId("rule"),
    ruleCode: r.code,
    title: r.title,
    category: "TEACHER",
    ruleText: r.text,
    teacherOriginalText: r.text,
    status: "PUBLISHED",
    lessonId: null,
    candidateId: null,
    priority: 90,
    createdAt: now,
    updatedAt: now,
  });
}

if (!(store.ruleTree as unknown[]).length) {
  const n1 = newId("rtn");
  const n2 = newId("rtn");
  const n3 = newId("rtn");
  const n4 = newId("rtn");
  const n5 = newId("rtn");
  const n6 = newId("rtn");
  store.ruleTree = [
    { id: n1, ruleCode: "Rule0003", parentId: null, label: "兄弟持世", condition: "兄弟持世？", yesChildId: n2, noChildId: null, outcomeText: null, sortOrder: 0 },
    { id: n2, ruleCode: "Rule0003", parentId: n1, label: "财旺？", condition: "财旺？", yesChildId: n3, noChildId: null, outcomeText: null, sortOrder: 1 },
    { id: n3, ruleCode: "Rule0004", parentId: n2, label: "伏神？", condition: "伏神？", yesChildId: n4, noChildId: null, outcomeText: null, sortOrder: 2 },
    { id: n4, ruleCode: "Rule0004", parentId: n3, label: "飞神克伏神？", condition: "飞神克伏神？", yesChildId: null, noChildId: n5, outcomeText: null, sortOrder: 3 },
    { id: n5, ruleCode: "Rule0003", parentId: n4, label: "月建旺？", condition: "月建旺？", yesChildId: n6, noChildId: null, outcomeText: null, sortOrder: 4 },
    { id: n6, ruleCode: "Rule0003", parentId: n5, label: "结论", condition: null, yesChildId: null, noChildId: null, outcomeText: "上涨概率增加。", sortOrder: 5 },
  ];
}

const chain = ["兄弟持世", "资金分流", "财伏藏", "上涨动力不足", "震荡"];
for (const label of chain) {
  if (!(store.nodes as Array<{ key: string }>).some((n) => n.key === label)) {
    (store.nodes as unknown[]).push({
      id: newId("kn"),
      key: label,
      label,
      kind: "CONCEPT",
      weightStars: 5,
      sourceLessonId: null,
    });
  }
}
for (let i = 0; i < chain.length - 1; i++) {
  const fromKey = chain[i]!;
  const toKey = chain[i + 1]!;
  if (!(store.edges as Array<{ fromKey: string; toKey: string }>).some((e) => e.fromKey === fromKey && e.toKey === toKey)) {
    (store.edges as unknown[]).push({
      id: newId("ke"),
      fromKey,
      toKey,
      relation: "IMPLIES",
      weightStars: 5,
      sourceLessonId: null,
    });
  }
}

const markets: Array<[string, string, number]> = [
  ["Rule0003", "bitcoin", 4],
  ["Rule0003", "gold", 5],
  ["Rule0003", "nasdaq100", 4],
  ["Rule0003", "micron", 5],
  ["Rule0003", "changxin", 5],
];
for (const [ruleCode, assetId, weightStars] of markets) {
  if (!(store.marketWeights as Array<{ ruleCode: string; assetId: string }>).some((m) => m.ruleCode === ruleCode && m.assetId === assetId)) {
    (store.marketWeights as unknown[]).push({
      id: newId("mrw"),
      ruleCode,
      assetId,
      weightStars,
      note: "老师市场映射种子",
    });
  }
}

store.updatedAt = now;
mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
console.log(`[seed-master-intelligence] wrote ${LOCAL_FILE} with ${RULES.length} baseline rules`);
