import "server-only";

import {
  listCases,
  listConflicts,
  listLessons,
  listMethods,
  listQuotes,
  listRules,
} from "@/lib/teacher-knowledge/store";
import type { PredictionKnowledgeHit, TeacherRuleRecord } from "@/lib/teacher-knowledge/types";

export type SearchFilters = {
  q?: string;
  status?: string;
  asset?: string;
  timeframe?: string;
  category?: string;
  teacherName?: string;
  lessonId?: string;
  approvedOnly?: boolean;
};

function scoreText(blob: string, q: string): number {
  const tokens = q
    .toLowerCase()
    .split(/[\s,，、]+/)
    .filter((t) => t.length >= 1);
  let s = 0;
  const b = blob.toLowerCase();
  for (const t of tokens) {
    if (b.includes(t)) s += t.length >= 2 ? 8 : 3;
  }
  return s;
}

export async function searchTeacherKnowledgeAdmin(filters: SearchFilters) {
  const q = (filters.q || "").trim();
  const lessons = await listLessons();
  let rules = await listRules();
  let cases = await listCases();
  const methods = await listMethods();
  const quotes = await listQuotes();
  const { listConcepts } = await import("@/lib/teacher-knowledge/store");
  const conceptsList = await listConcepts();

  if (filters.approvedOnly || filters.status === "APPROVED") {
    rules = rules.filter((r) => r.status === "APPROVED");
    cases = cases.filter((c) => c.status === "APPROVED");
  } else if (filters.status === "DRAFT") {
    rules = rules.filter((r) => r.status === "DRAFT");
    cases = cases.filter((c) => c.status === "DRAFT");
  } else if (filters.status) {
    rules = rules.filter((r) => r.status === filters.status);
    cases = cases.filter((c) => c.status === filters.status);
  }

  if (filters.category) rules = rules.filter((r) => r.category === filters.category);
  if (filters.asset) {
    rules = rules.filter((r) => r.applicableAssets.some((a) => a.includes(filters.asset!)) || r.conclusion.includes(filters.asset!));
    cases = cases.filter((c) => c.asset.includes(filters.asset!) || c.title.includes(filters.asset!));
  }
  if (filters.timeframe) {
    rules = rules.filter((r) => r.applicableTimeframes.some((t) => t.includes(filters.timeframe!)));
  }
  if (filters.lessonId) {
    rules = rules.filter((r) => r.sourceLessonId === filters.lessonId);
    cases = cases.filter((c) => c.sourceLessonId === filters.lessonId);
  }

  const lessonFiltered = lessons.filter((l) => {
    if (filters.teacherName && !l.teacherName.includes(filters.teacherName)) return false;
    if (!q) return true;
    return (
      scoreText(`${l.lessonCode} ${l.title} ${l.rawTranscript} ${l.tags.join(" ")}`, q) > 0
    );
  });

  const ruleHits = (q
    ? rules
        .map((r) => ({
          r,
          s: scoreText(
            `${r.ruleCode} ${r.title} ${r.conclusion} ${r.sourceQuote} ${r.keywords.join(" ")} ${r.conditions.join(" ")}`,
            q
          ),
        }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.r)
    : rules
  ).slice(0, 80);

  const caseHits = (q
    ? cases
        .map((c) => ({
          c,
          s: scoreText(`${c.caseCode} ${c.title} ${c.asset} ${c.question} ${c.teacherConclusion} ${c.sourceQuote}`, q),
        }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c)
    : cases
  ).slice(0, 80);

  return {
    lessons: lessonFiltered.slice(0, 40).map((l) => ({
      id: l.id,
      lessonCode: l.lessonCode,
      title: l.title,
      teacherName: l.teacherName,
      status: l.status,
    })),
    rules: ruleHits,
    cases: caseHits,
    concepts: conceptsList.filter((c) => !q || scoreText(`${c.name} ${c.definition} ${c.sourceQuote}`, q) > 0).slice(0, 40),
    quotes: quotes.filter((qt) => !q || scoreText(`${qt.quote} ${qt.meaning}`, q) > 0).slice(0, 40),
    methods: methods.filter((m) => !q || scoreText(`${m.title} ${m.steps.join(" ")}`, q) > 0).slice(0, 40),
  };
}

/** Prediction engine retrieval — APPROVED only, ranked, with citations. */
export async function retrieveForPrediction(input: {
  query: string;
  asset?: string | null;
  timeframe?: string | null;
  limit?: number;
}): Promise<PredictionKnowledgeHit> {
  const q = input.query.trim();
  const limit = input.limit ?? 8;
  const [rules, cases, methods, quotes, conflicts, lessons] = await Promise.all([
    listRules({ status: "APPROVED" }),
    listCases({ status: "APPROVED" }),
    listMethods({ status: "APPROVED" }),
    listQuotes({ status: "APPROVED" }),
    listConflicts(),
    listLessons(),
  ]);

  const lessonCodeById = new Map(lessons.map((l) => [l.id, l.lessonCode]));

  const matchedRules = rules
    .map((r) => {
      let s = scoreText(`${r.title} ${r.conclusion} ${r.keywords.join(" ")} ${r.sourceQuote}`, q);
      if (input.asset && r.applicableAssets.some((a) => a.includes(input.asset!))) s += 20;
      if (input.timeframe && r.applicableTimeframes.some((t) => t.includes(input.timeframe!))) s += 12;
      s += r.priority / 10;
      return { r, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);

  const matchedCases = cases
    .map((c) => {
      let s = scoreText(`${c.title} ${c.asset} ${c.question} ${c.teacherConclusion}`, q);
      if (input.asset && c.asset.includes(input.asset)) s += 25;
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(3, Math.floor(limit / 2)))
    .map((x) => x.c);

  const matchedMethods = methods
    .map((m) => ({ m, s: scoreText(`${m.title} ${m.steps.join(" ")}`, q) || 1 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.m);

  const matchedQuotes = quotes
    .map((qt) => ({ qt, s: scoreText(`${qt.quote} ${qt.meaning}`, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => x.qt);

  const ruleIds = new Set(matchedRules.map((r) => r.id));
  const relatedConflicts = conflicts.filter(
    (c) => c.status === "OPEN" && (ruleIds.has(c.ruleAId) || ruleIds.has(c.ruleBId))
  );

  const missingInformation: string[] = [];
  if (!matchedRules.length) missingInformation.push("未命中已审核老师正式规则");
  if (input.asset && !matchedCases.some((c) => c.asset.includes(input.asset!))) {
    missingInformation.push(`缺少资产「${input.asset}」的正式老师案例`);
  }

  const citations: PredictionKnowledgeHit["citations"] = [];
  for (const r of matchedRules) {
    citations.push({ type: "RULE", code: r.ruleCode, label: r.title });
    const lc = r.sourceLessonId ? lessonCodeById.get(r.sourceLessonId) : null;
    if (lc) citations.push({ type: "LESSON", code: lc, label: "来源课程" });
  }
  for (const c of matchedCases) {
    citations.push({ type: "CASE", code: c.caseCode, label: c.title });
  }
  for (const m of matchedMethods) {
    citations.push({ type: "METHOD", code: m.id.slice(0, 12), label: m.title });
  }

  return {
    matchedRules,
    matchedCases,
    matchedMethods,
    matchedQuotes,
    conflicts: relatedConflicts,
    missingInformation,
    citations,
  };
}

/** AI reader — approved short payloads only, no full transcripts. */
export async function searchForAiReader(input: {
  q: string;
  asset?: string;
  timeframe?: string;
  categories?: string[];
  limit?: number;
}) {
  const hit = await retrieveForPrediction({
    query: input.q,
    asset: input.asset,
    timeframe: input.timeframe,
    limit: input.limit ?? 10,
  });
  let rules = hit.matchedRules as TeacherRuleRecord[];
  if (input.categories?.length) {
    rules = rules.filter((r) => input.categories!.includes(r.category));
  }
  const lessons = await listLessons();
  const codeMap = new Map(lessons.map((l) => [l.id, l.lessonCode]));

  return {
    rules: rules.map((r) => ({
      ruleCode: r.ruleCode,
      title: r.title,
      category: r.category,
      conclusion: r.conclusion.slice(0, 400),
      conditions: r.conditions,
      exceptions: r.exceptions,
      sourceLessonCode: r.sourceLessonId ? codeMap.get(r.sourceLessonId) || null : null,
      sourceQuote: r.sourceQuote.slice(0, 240),
    })),
    cases: hit.matchedCases.map((c) => ({
      caseCode: c.caseCode,
      title: c.title,
      asset: c.asset,
      question: c.question,
      teacherConclusion: c.teacherConclusion.slice(0, 400),
      sourceLessonCode: c.sourceLessonId ? codeMap.get(c.sourceLessonId) || null : null,
      sourceQuote: c.sourceQuote.slice(0, 240),
    })),
    methods: hit.matchedMethods.map((m) => ({
      title: m.title,
      steps: m.steps,
      sourceLessonCode: m.sourceLessonId ? codeMap.get(m.sourceLessonId) || null : null,
    })),
  };
}
