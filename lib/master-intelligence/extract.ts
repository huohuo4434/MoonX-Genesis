import type { ExtractedItem, ExtractionBundle } from "@/lib/master-intelligence/types";

const RULE_HINTS =
  /(用神|妻财|兄弟持世|财伏藏|官鬼|子孙|父母|月破|化退|时间窗口|飞神|伏神|世应)/;

function pushItem(list: ExtractedItem[], title: string, body: string, motif?: string) {
  const t = title.trim();
  const b = body.trim();
  if (!t || !b) return;
  if (list.some((x) => x.title === t && x.body === b)) return;
  list.push({ title: t.slice(0, 80), body: b.slice(0, 800), motif });
}

/**
 * Heuristic knowledge split — works offline without LLM.
 * Does not invent market outcomes; only segments teacher-like statements.
 */
export function extractKnowledgeHeuristic(cleanText: string): ExtractionBundle {
  const rules: ExtractedItem[] = [];
  const cases: ExtractedItem[] = [];
  const concepts: ExtractedItem[] = [];
  const formulas: ExtractedItem[] = [];
  const exceptions: ExtractedItem[] = [];
  const predictions: ExtractedItem[] = [];
  const quotes: ExtractedItem[] = [];

  const paragraphs = cleanText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 8);

  for (const p of paragraphs) {
    if (/例外|但是如果|除非|特殊情况/.test(p)) {
      pushItem(exceptions, `例外：${p.slice(0, 24)}`, p);
      continue;
    }
    if (/步骤|流程|先.*再|第一步|第二步/.test(p)) {
      pushItem(formulas, `流程：${p.slice(0, 24)}`, p);
      continue;
    }
    if (/案例|比如|例如|黄金|比特币|BTC|纳斯达克|美光|长鑫/.test(p) && /预测|判断|结论/.test(p)) {
      const asset =
        /黄金/.test(p) ? "gold" : /BTC|比特币/.test(p) ? "bitcoin" : /纳斯达克|纳指/.test(p) ? "nasdaq100" : undefined;
      pushItem(cases, `案例：${p.slice(0, 24)}`, p, asset);
      continue;
    }
    if (/看涨|看跌|上涨|下跌|震荡|年底|目标/.test(p) && /我|老师|判断|预计/.test(p)) {
      pushItem(predictions, `预测：${p.slice(0, 24)}`, p);
      continue;
    }
    if (RULE_HINTS.test(p) || /规则|原则|记住|一定要/.test(p)) {
      const motif = p.match(RULE_HINTS)?.[0];
      pushItem(rules, motif ? `规则：${motif}` : `规则：${p.slice(0, 24)}`, p, motif);
      continue;
    }
    if (/所谓|概念|定义|意思是/.test(p)) {
      pushItem(concepts, `概念：${p.slice(0, 24)}`, p);
      continue;
    }
    if (/不用看了|重点看|继续分析|记住这句话/.test(p) || p.length <= 40) {
      pushItem(quotes, `原话：${p.slice(0, 24)}`, p);
    }
  }

  if (!rules.length && cleanText.length > 20) {
    pushItem(concepts, "课程要点", cleanText.slice(0, 400));
  }

  const summary =
    paragraphs.slice(0, 3).join(" ").slice(0, 280) ||
    cleanText.slice(0, 200) ||
    "本节课知识拆解待审核。";

  return { summary, rules, cases, concepts, formulas, exceptions, predictions, quotes };
}

/** Optional OpenAI extraction when key present; falls back to heuristic. */
export async function extractKnowledge(cleanText: string): Promise<ExtractionBundle> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || cleanText.length < 40) {
    return extractKnowledgeHeuristic(cleanText);
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
            content:
              "你是六爻投资老师知识拆解引擎。从课程文本中拆出 RULE/CASE/CONCEPT/FORMULA/EXCEPTION/PREDICTION/QUOTE。不得编造原文没有的结论。返回 JSON：{summary,rules,cases,concepts,formulas,exceptions,predictions,quotes}，每项为 {title,body,motif?} 数组。",
          },
          { role: "user", content: cleanText.slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) return extractKnowledgeHeuristic(cleanText);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return extractKnowledgeHeuristic(cleanText);
    const parsed = JSON.parse(content) as Partial<ExtractionBundle>;
    const base = extractKnowledgeHeuristic(cleanText);
    return {
      summary: String(parsed.summary || base.summary),
      rules: Array.isArray(parsed.rules) && parsed.rules.length ? parsed.rules : base.rules,
      cases: Array.isArray(parsed.cases) && parsed.cases.length ? parsed.cases : base.cases,
      concepts: Array.isArray(parsed.concepts) && parsed.concepts.length ? parsed.concepts : base.concepts,
      formulas: Array.isArray(parsed.formulas) && parsed.formulas.length ? parsed.formulas : base.formulas,
      exceptions:
        Array.isArray(parsed.exceptions) && parsed.exceptions.length ? parsed.exceptions : base.exceptions,
      predictions:
        Array.isArray(parsed.predictions) && parsed.predictions.length
          ? parsed.predictions
          : base.predictions,
      quotes: Array.isArray(parsed.quotes) && parsed.quotes.length ? parsed.quotes : base.quotes,
    };
  } catch {
    return extractKnowledgeHeuristic(cleanText);
  }
}
