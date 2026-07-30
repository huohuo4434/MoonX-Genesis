import type { CallableKnowledgeItem, TeacherNoteRecord } from "./types";

export type TeacherSearchHit = {
  noteId: string;
  score: number;
  matchedKeywords: string[];
  knowledge: CallableKnowledgeItem[];
  cases: TeacherNoteRecord["cases"];
  summary: string;
  sourceAudio: string;
};

const DOMAIN_HINTS = ["美光", "半导体", "财爻", "兄弟持世", "历史案例", "官鬼", "世爻", "应爻"];

export function tokenizeTeacherQuery(query: string): string[] {
  const base = query
    .toLowerCase()
    .split(/[\s,，、；;|/\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
  const expanded = [...base];
  for (const hint of DOMAIN_HINTS) {
    if (query.includes(hint) || base.some((t) => hint.includes(t) || t.includes(hint))) {
      expanded.push(hint);
    }
  }
  if (query.includes("美光") || /mu\s?g?$/i.test(query)) {
    expanded.push("美光", "半导体", "存储");
  }
  return Array.from(new Set(expanded));
}

export function searchTeacherKnowledge(
  notes: TeacherNoteRecord[],
  query: string,
  options?: { limit?: number }
): TeacherSearchHit[] {
  const tokens = tokenizeTeacherQuery(query);
  if (tokens.length === 0) return [];

  const hits: TeacherSearchHit[] = [];
  for (const note of notes) {
    if (note.status === "FAILED") continue;
    const blob = [
      note.summary,
      note.rawText,
      ...note.keywords,
      ...note.knowledge.map((k) => [k.category, k.topic, k.rule, k.example, ...k.keywords].join(" ")),
      ...note.cases.map((c) => [c.question, c.hexagram, c.teacherJudgment, c.actualResult].join(" ")),
      JSON.stringify(note.rules ?? {}),
    ]
      .join("\n")
      .toLowerCase();

    const matched = tokens.filter((t) => blob.includes(t.toLowerCase()));
    if (matched.length === 0) continue;

    let score = matched.length * 12;
    for (const kw of note.keywords) {
      if (tokens.some((t) => kw.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(kw.toLowerCase()))) {
        score += 8;
      }
    }
    for (const c of note.cases) {
      if (tokens.some((t) => c.question.includes(t) || c.hexagram.includes(t))) score += 15;
    }

    hits.push({
      noteId: note.id,
      score,
      matchedKeywords: matched.slice(0, 12),
      knowledge: note.knowledge.slice(0, 8),
      cases: note.cases.slice(0, 5),
      summary: note.summary,
      sourceAudio: note.sourceAudio,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, options?.limit ?? 8);
}
