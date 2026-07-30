import type {
  CallableKnowledgeItem,
  CoreTheoryRules,
  TeacherCaseItem,
} from "@/lib/teacher-voice-learning/types";

const SECTION_KEYS = [
  "老师核心规则",
  "六亲判断",
  "世应判断",
  "财爻判断",
  "旺衰判断",
  "错误复盘",
] as const;

const GRANULAR_KEYS = [
  "世爻",
  "应爻",
  "财爻",
  "官鬼",
  "父母",
  "兄弟",
  "子孙",
  "旺衰",
  "月建",
  "日辰",
  "伏神",
  "飞神",
  "化进化退",
] as const;

export type OrganizedLearning = {
  summary: string;
  rules: CoreTheoryRules;
  cases: TeacherCaseItem[];
  knowledge: CallableKnowledgeItem[];
  keywords: string[];
  markdown: string;
};

function pickSnippet(rawText: string, keys: string[]): string {
  const hits: string[] = [];
  for (const key of keys) {
    const re = new RegExp(`${key}[^。；\\n]{0,100}`, "g");
    const m = rawText.match(re);
    if (m?.[0]) hits.push(m[0].trim());
  }
  return hits.join("；") || "";
}

function heuristicOrganize(rawText: string): OrganizedLearning {
  const rules: CoreTheoryRules = {};

  for (const key of GRANULAR_KEYS) {
    const re = new RegExp(`${key}[^。；\\n]{0,80}`, "g");
    const m = rawText.match(re);
    if (m?.[0]) rules[key] = m[0].trim();
  }

  rules.六亲判断 =
    pickSnippet(rawText, ["六亲", "官鬼", "父母", "兄弟", "子孙", "妻财", "财爻"]) ||
    [rules.官鬼, rules.父母, rules.兄弟, rules.子孙, rules.财爻].filter(Boolean).join("；") ||
    undefined;

  rules.世应判断 =
    pickSnippet(rawText, ["世爻", "应爻", "世应", "持世"]) ||
    [rules.世爻, rules.应爻].filter(Boolean).join("；") ||
    undefined;

  rules.财爻判断 = pickSnippet(rawText, ["财爻", "妻财", "财旺", "财弱"]) || rules.财爻 || undefined;

  rules.旺衰判断 =
    pickSnippet(rawText, ["旺衰", "月建", "日辰", "旺", "衰", "空亡"]) ||
    [rules.旺衰, rules.月建, rules.日辰].filter(Boolean).join("；") ||
    undefined;

  rules.老师核心规则 =
    [
      rules.世应判断,
      rules.六亲判断,
      rules.财爻判断,
      rules.旺衰判断,
      rules.伏神,
      rules.飞神,
      rules.化进化退,
    ]
      .filter(Boolean)
      .join("\n") || rawText.slice(0, 280);

  const errorHints =
    rawText.match(/(?:错误|复盘|打脸|看错|误判|纠正)[^。]{0,120}/g) ?? [];
  rules.错误复盘 = errorHints.map((s) => s.trim()).join("；") || "（本节未明确错误复盘）";

  const cases: TeacherCaseItem[] = [];
  const caseHints =
    rawText.match(/(?:美光|黄金|比特币|BTC|纳斯达克|半导体|长鑫|原油|WTI)[^。]{0,120}/g) ?? [];
  for (const h of caseHints.slice(0, 5)) {
    cases.push({
      question: h.slice(0, 40),
      hexagram: "（待补全卦象）",
      teacherJudgment: h,
      actualResult: "（待验证）",
    });
  }

  const knowledge: CallableKnowledgeItem[] = [];
  for (const topic of SECTION_KEYS) {
    const rule = rules[topic];
    if (!rule) continue;
    knowledge.push({
      category: topic === "错误复盘" ? "错误复盘" : "老师核心规则",
      topic,
      rule,
      example: cases[0]?.teacherJudgment ?? "",
      keywords: [topic, "六爻", "老师"],
    });
  }

  const keywords = Array.from(
    new Set(
      [
        ...SECTION_KEYS.filter((k) => rules[k]),
        ...Object.keys(rules),
        ...cases.flatMap((c) => c.question.split(/\s+/)),
        "六爻",
        "老师",
      ].filter((k) => k && k.length >= 2)
    )
  ).slice(0, 40);

  const summary = `老师语音学习：核心规则已整理；案例 ${cases.length} 条；含错误复盘。`;
  const markdown = buildMarkdown(rules, cases, knowledge);

  return { summary, rules, cases, knowledge, keywords, markdown };
}

function buildMarkdown(
  rules: CoreTheoryRules,
  cases: TeacherCaseItem[],
  knowledge: CallableKnowledgeItem[]
): string {
  const sections = SECTION_KEYS.map((k) => `【${k}】\n${rules[k] || "（本节未明确）"}`).join("\n\n");
  const casesMd = cases
    .map(
      (c, i) =>
        `案例${i + 1}\n问题：${c.question}\n卦象：${c.hexagram}\n老师判断：${c.teacherJudgment}\n实际结果：${c.actualResult}`
    )
    .join("\n\n");
  return `${sections}\n\n【案例分析】\n${casesMd || "（本节未识别到明确案例）"}\n\n【可调用知识】\n${JSON.stringify(knowledge, null, 2)}`;
}

/** AI organize with fixed template; falls back to heuristic without API key. */
export async function organizeTeacherVoiceText(rawText: string): Promise<OrganizedLearning> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || rawText.trim().length < 20) {
    return heuristicOrganize(rawText);
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `你是六爻投资老师语音学习引擎。只根据原文整理，禁止编造。原文没有的内容写「（本节未明确）」。
必须按以下固定结构返回 JSON：
{
  "summary": string,
  "rules": {
    "老师核心规则": string,
    "六亲判断": string,
    "世应判断": string,
    "财爻判断": string,
    "旺衰判断": string,
    "错误复盘": string,
    "世爻"?: string,
    "应爻"?: string,
    "财爻"?: string,
    "官鬼"?: string,
    "父母"?: string,
    "兄弟"?: string,
    "子孙"?: string,
    "旺衰"?: string,
    "月建"?: string,
    "日辰"?: string,
    "伏神"?: string,
    "飞神"?: string,
    "化进化退"?: string
  },
  "cases": [{"question":"","hexagram":"","teacherJudgment":"","actualResult":""}],
  "knowledge": [{"category":"","topic":"","rule":"","example":"","keywords":[]}],
  "keywords": []
}
说明：
- 老师核心规则：总括老师反复强调的判断原则
- 六亲判断：官鬼/父母/兄弟/子孙/妻财等相关规则
- 世应判断：世爻、应爻、持世关系
- 财爻判断：财爻旺衰与资金含义
- 旺衰判断：月建、日辰、空亡、生克等
- 案例分析：原文中的标的/卦例
- 错误复盘：老师提到的看错、纠正、打脸、复盘点`,
          },
          { role: "user", content: rawText.slice(0, 14000) },
        ],
      }),
    });
    if (!res.ok) return heuristicOrganize(rawText);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return heuristicOrganize(rawText);
    const parsed = JSON.parse(content) as Partial<OrganizedLearning>;
    const base = heuristicOrganize(rawText);
    const rules: CoreTheoryRules = { ...base.rules, ...(parsed.rules || {}) };
    for (const k of SECTION_KEYS) {
      if (!rules[k]) rules[k] = base.rules[k] || "（本节未明确）";
    }
    const cases = Array.isArray(parsed.cases) && parsed.cases.length ? parsed.cases : base.cases;
    const knowledge =
      Array.isArray(parsed.knowledge) && parsed.knowledge.length ? parsed.knowledge : base.knowledge;
    const keywords =
      Array.isArray(parsed.keywords) && parsed.keywords.length ? parsed.keywords : base.keywords;
    const summary = String(parsed.summary || base.summary);
    return {
      summary,
      rules,
      cases,
      knowledge,
      keywords,
      markdown: buildMarkdown(rules, cases, knowledge),
    };
  } catch {
    return heuristicOrganize(rawText);
  }
}
