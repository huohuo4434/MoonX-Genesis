import type {
  DraftCase,
  DraftConcept,
  DraftQuote,
  DraftRule,
} from "@/lib/teacher-learning-center/types";

export type AiLearningResult = {
  courseSummary: string;
  coreViews: string;
  classicQuotes: string[];
  rules: DraftRule[];
  cases: DraftCase[];
  concepts: DraftConcept[];
  quotes: DraftQuote[];
  mnemonics: DraftConcept[];
  exceptions: DraftConcept[];
  predictions: DraftConcept[];
};

function heuristic(rawText: string): AiLearningResult {
  const lines = rawText
    .split(/[。！？\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);

  const rules: DraftRule[] = [];
  for (const key of ["兄弟持世", "财爻", "世爻", "应爻", "官鬼", "月建", "日辰", "伏神", "化退"]) {
    const hit = lines.find((l) => l.includes(key));
    if (hit) {
      rules.push({
        title: key,
        content: hit,
        sourceMinute: "未知",
        confidence: "Draft",
      });
    }
  }

  const cases: DraftCase[] = [];
  for (const asset of ["美光", "黄金", "比特币", "纳斯达克", "长鑫", "原油"]) {
    const hit = lines.find((l) => l.includes(asset));
    if (hit) {
      cases.push({
        assetName: asset,
        question: "未来走势",
        teacherConclusion: hit,
        sourceText: hit,
      });
    }
  }

  const classicQuotes = lines.filter((l) => l.length >= 12 && l.length <= 80).slice(0, 8);
  const concepts: DraftConcept[] = rules.slice(0, 3).map((r) => ({
    kind: "CONCEPT" as const,
    title: r.title,
    content: r.content,
  }));

  return {
    courseSummary: `本节提炼规则 ${rules.length} 条、案例 ${cases.length} 条。`,
    coreViews: rules.map((r) => `${r.title}：${r.content}`).join("\n") || rawText.slice(0, 400),
    classicQuotes,
    rules,
    cases,
    concepts,
    quotes: classicQuotes.map((t) => ({ text: t, sourceMinute: "未知" })),
    mnemonics: [],
    exceptions: [],
    predictions: [],
  };
}

/** AI organize — never mutates rawText (caller keeps original). */
export async function runTeacherAiLearning(rawText: string): Promise<AiLearningResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || rawText.trim().length < 30) return heuristic(rawText);

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
            content: `你是六爻老师课程学习引擎。只根据原文整理，禁止编造，禁止改写原文句子到「对应原文/经典原话」之外。
返回 JSON：
{
  "courseSummary": string,
  "coreViews": string,
  "classicQuotes": string[],
  "rules": [{"title":"","content":"","sourceMinute":"","confidence":"Draft"}],
  "cases": [{"assetName":"","question":"","teacherConclusion":"","sourceText":""}],
  "concepts": [{"kind":"CONCEPT","title":"","content":""}],
  "quotes": [{"text":"","sourceMinute":""}],
  "mnemonics": [{"kind":"MNEMONIC","title":"","content":""}],
  "exceptions": [{"kind":"EXCEPTION","title":"","content":""}],
  "predictions": [{"kind":"PREDICTION","title":"","content":""}]
}
分类：老师规则/案例/概念/口诀/例外/预测。`,
          },
          { role: "user", content: rawText.slice(0, 16000) },
        ],
      }),
    });
    if (!res.ok) return heuristic(rawText);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return heuristic(rawText);
    const parsed = JSON.parse(content) as Partial<AiLearningResult>;
    const base = heuristic(rawText);
    return {
      courseSummary: String(parsed.courseSummary || base.courseSummary),
      coreViews: String(parsed.coreViews || base.coreViews),
      classicQuotes: Array.isArray(parsed.classicQuotes) ? parsed.classicQuotes.map(String) : base.classicQuotes,
      rules: Array.isArray(parsed.rules) && parsed.rules.length ? normalizeRules(parsed.rules) : base.rules,
      cases: Array.isArray(parsed.cases) && parsed.cases.length ? normalizeCases(parsed.cases) : base.cases,
      concepts:
        Array.isArray(parsed.concepts) && parsed.concepts.length
          ? normalizeConcepts(parsed.concepts, "CONCEPT")
          : base.concepts,
      quotes: Array.isArray(parsed.quotes) && parsed.quotes.length ? normalizeQuotes(parsed.quotes) : base.quotes,
      mnemonics: Array.isArray(parsed.mnemonics)
        ? normalizeConcepts(parsed.mnemonics, "MNEMONIC")
        : base.mnemonics,
      exceptions: Array.isArray(parsed.exceptions)
        ? normalizeConcepts(parsed.exceptions, "EXCEPTION")
        : base.exceptions,
      predictions: Array.isArray(parsed.predictions)
        ? normalizeConcepts(parsed.predictions, "PREDICTION")
        : base.predictions,
    };
  } catch {
    return heuristic(rawText);
  }
}

function normalizeRules(rows: DraftRule[]): DraftRule[] {
  return rows.map((r) => ({
    title: String(r.title || "未命名规则"),
    content: String(r.content || ""),
    sourceMinute: String(r.sourceMinute || "未知"),
    confidence: "Draft" as const,
  }));
}

function normalizeCases(rows: DraftCase[]): DraftCase[] {
  return rows.map((c) => ({
    assetName: String(c.assetName || "未知标的"),
    question: String(c.question || "未来走势"),
    teacherConclusion: String(c.teacherConclusion || ""),
    sourceText: String(c.sourceText || ""),
  }));
}

function normalizeConcepts(
  rows: DraftConcept[],
  kind: DraftConcept["kind"]
): DraftConcept[] {
  return rows.map((c) => ({
    kind: (c.kind as DraftConcept["kind"]) || kind,
    title: String(c.title || "未命名"),
    content: String(c.content || ""),
  }));
}

function normalizeQuotes(rows: DraftQuote[]): DraftQuote[] {
  return rows.map((q) => ({
    text: String(q.text || ""),
    sourceMinute: String(q.sourceMinute || "未知"),
  }));
}
