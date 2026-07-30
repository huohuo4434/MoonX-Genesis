import type { AiExtractResult } from "@/lib/teacher-knowledge/types";

const DEFAULT_METHOD_STEPS = [
  "定用神",
  "看世应",
  "看旺衰",
  "看月建",
  "看日辰",
  "看动静",
  "看伏神",
  "看飞神",
  "看冲合刑害",
  "看生克制化",
  "最后参考卦意",
];

function heuristicExtract(raw: string): AiExtractResult {
  const lines = raw
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  const motifs = ["兄弟持世", "财爻", "世爻", "应爻", "用神", "月建", "日辰", "伏神", "飞神", "化退", "旺衰"];
  const rules = [];
  for (const m of motifs) {
    const hit = lines.find((l) => l.includes(m));
    if (!hit) continue;
    rules.push({
      title: m,
      category: m.includes("世") || m.includes("应") ? "SHI_YING" : m.includes("财") || m.includes("兄弟") ? "SIX_RELATIONS" : "OTHER",
      conditions: [m],
      conclusion: hit,
      sourceQuote: hit,
      keywords: [m],
      status: "DRAFT" as const,
      confidence: 40,
      priority: 50,
    });
  }

  const assets = ["美光", "黄金", "比特币", "纳斯达克", "长鑫", "原油", "WTI"];
  const cases = [];
  for (const a of assets) {
    const hit = lines.find((l) => l.includes(a));
    if (!hit) continue;
    cases.push({
      title: `${a}案例`,
      asset: a,
      question: "未来走势",
      teacherConclusion: hit,
      sourceQuote: hit,
      mainHexagram: null,
      changedHexagram: null,
      movingLines: null,
      monthBranch: null,
      dayBranch: null,
      status: "DRAFT" as const,
    });
  }

  const quotes = lines.filter((l) => l.length >= 10 && l.length <= 100).slice(0, 10).map((quote) => ({
    quote,
    meaning: "",
    toneType: "NORMAL",
    status: "DRAFT" as const,
  }));

  return {
    summary: `从原文提取候选规则 ${rules.length} 条、案例 ${cases.length} 条（启发式，待审核）。`,
    cleanedTranscript: "",
    rules,
    cases,
    concepts: rules.slice(0, 3).map((r) => ({
      name: r.title,
      definition: r.conclusion,
      sourceQuote: r.sourceQuote,
      status: "DRAFT" as const,
    })),
    quotes,
    methods: [
      {
        title: "老师固定分析流程",
        steps: DEFAULT_METHOD_STEPS,
        sourceQuote: lines.find((l) => l.includes("用神") || l.includes("世应")) || "",
        status: "DRAFT" as const,
      },
    ],
    exceptions: lines.filter((l) => /例外|除非|但是|不过/.test(l)).slice(0, 5),
    uncertain: lines.filter((l) => /可能|大概|不好说|待看/.test(l)).slice(0, 5),
    possibleConflicts: [],
  };
}

/** AI extract drafts only — never invent hexagram fields not in text; never mutate raw. */
export async function extractTeacherKnowledge(rawTranscript: string): Promise<AiExtractResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || rawTranscript.trim().length < 40) return heuristicExtract(rawTranscript);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `你是六爻老师课程知识提取器。只根据原文，禁止创造老师没说过的结论，禁止用常见六爻知识补全文。
每条规则必须带 sourceQuote（老师原话原文片段）。含义不清标记 uncertain。
案例中主卦/变卦/动爻/月建/日辰若原文未明确出现必须为 null，不得编造。
全部 status 为 DRAFT。
返回 JSON：
{
  "summary": string,
  "cleanedTranscript": string,
  "rules": [{"title":"","category":"OTHER|USE_GOD|SHI_YING|PROSPERITY_DECLINE|MONTH_BRANCH|DAY_BRANCH|MOVING_LINE|HIDDEN_SPIRIT|FLYING_SPIRIT|SIX_RELATIONS|CLASH_COMBINATION|TRANSFORMATION|TIMING|MARKET_APPLICATION|EXCEPTION","conditions":[],"analysisSteps":[],"conclusion":"","exceptions":[],"applicableAssets":[],"applicableTimeframes":[],"keywords":[],"priority":50,"confidence":50,"sourceQuote":""}],
  "cases": [{"title":"","asset":"","question":"","teacherConclusion":"","sourceQuote":"","mainHexagram":null,"changedHexagram":null,"movingLines":null,"monthBranch":null,"dayBranch":null,"useGod":null,"shiLine":null,"yingLine":null}],
  "concepts": [{"name":"","definition":"","sourceQuote":"","conditions":[]}],
  "quotes": [{"quote":"","meaning":"","toneType":"NORMAL|HIGH_CERTAINTY|NEEDS_DEEPER_ANALYSIS|IMPORTANT|WARNING"}],
  "methods": [{"title":"","steps":[],"sourceQuote":"","conditions":[],"exceptions":[]}],
  "exceptions": [],
  "uncertain": [],
  "possibleConflicts": [{"againstHint":"","reason":"","sourceQuote":""}]
}`,
          },
          { role: "user", content: rawTranscript.slice(0, 20000) },
        ],
      }),
    });
    if (!res.ok) return heuristicExtract(rawTranscript);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return heuristicExtract(rawTranscript);
    const parsed = JSON.parse(content) as AiExtractResult;
    const base = heuristicExtract(rawTranscript);
    return {
      summary: String(parsed.summary || base.summary),
      cleanedTranscript: String(parsed.cleanedTranscript || ""),
      rules: Array.isArray(parsed.rules) && parsed.rules.length ? parsed.rules : base.rules,
      cases: Array.isArray(parsed.cases) && parsed.cases.length ? parsed.cases : base.cases,
      concepts: Array.isArray(parsed.concepts) && parsed.concepts.length ? parsed.concepts : base.concepts,
      quotes: Array.isArray(parsed.quotes) && parsed.quotes.length ? parsed.quotes : base.quotes,
      methods: Array.isArray(parsed.methods) && parsed.methods.length ? parsed.methods : base.methods,
      exceptions: Array.isArray(parsed.exceptions) ? parsed.exceptions.map(String) : base.exceptions,
      uncertain: Array.isArray(parsed.uncertain) ? parsed.uncertain.map(String) : base.uncertain,
      possibleConflicts: Array.isArray(parsed.possibleConflicts) ? parsed.possibleConflicts : [],
    };
  } catch {
    return heuristicExtract(rawTranscript);
  }
}
