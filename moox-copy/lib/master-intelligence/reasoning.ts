import "server-only";

import {
  listGraph,
  listMarketWeights,
  listPublishedCases,
  listPublishedRules,
  listRuleTree,
} from "@/lib/master-intelligence/store";
import { detectVoiceSignals } from "@/lib/master-intelligence/voice";
import type { ReasoningCitation, ReasoningResult, VoiceSignal } from "@/lib/master-intelligence/types";
import { retrieveForPrediction } from "@/lib/teacher-knowledge/search";

/**
 * Teacher-first reasoning retrieval order:
 * 1. APPROVED TeacherRule
 * 2. APPROVED TeacherCase
 * 3. APPROVED TeacherMethod
 * 4. APPROVED TeacherQuote
 * 5. internal MasterRule / MasterCase / graph
 * Never dumps entire KB; never uses draft rules.
 */
export async function runTeacherReasoning(input: {
  query: string;
  assetId?: string | null;
}): Promise<ReasoningResult> {
  const q = input.query.trim();
  const tk = await retrieveForPrediction({
    query: q,
    asset: input.assetId,
    limit: 8,
  });

  const rules = await listPublishedRules();
  const cases = await listPublishedCases();
  const { nodes, edges } = await listGraph();
  const tree = await listRuleTree();
  const marketWeights = await listMarketWeights();

  const published = rules.filter((r) => r.status === "PUBLISHED" || r.status === "ACTIVE");
  const matchedRules = published
    .filter((r) => {
      const blob = `${r.title}\n${r.ruleText}\n${r.teacherOriginalText ?? ""}`;
      return q.split(/\s+/).some((tok) => tok.length >= 2 && blob.includes(tok)) || blob.includes(q.slice(0, 12));
    })
    .slice(0, 8);

  const motifs = ["兄弟持世", "财伏藏", "官鬼", "用神", "月破", "化退", "子孙", "父母", "妻财"];
  for (const m of motifs) {
    if (q.includes(m)) {
      for (const r of published) {
        if (`${r.title}${r.ruleText}`.includes(m) && !matchedRules.some((x) => x.id === r.id)) {
          matchedRules.push(r);
        }
      }
    }
  }

  const matchedCases = cases
    .filter((c) => {
      if (input.assetId && c.assetId === input.assetId) return true;
      const blob = `${c.caseTitle}\n${c.question ?? ""}\n${c.teacherConclusion ?? ""}`;
      return motifs.some((m) => q.includes(m) && blob.includes(m)) || blob.includes(q.slice(0, 8));
    })
    .slice(0, 6);

  const graphPath: string[] = [];
  const startNodes = nodes.filter((n) => q.includes(n.label) || q.includes(n.key));
  for (const n of startNodes.slice(0, 3)) {
    graphPath.push(n.label);
    let cur = n.key;
    for (let depth = 0; depth < 4; depth++) {
      const edge = edges.find((e) => e.fromKey === cur);
      if (!edge) break;
      const next = nodes.find((x) => x.key === edge.toKey);
      if (!next) break;
      graphPath.push(next.label);
      cur = next.key;
    }
  }

  const voiceSignals: VoiceSignal[] = detectVoiceSignals(q).map((v) => v.signal);
  const citations: ReasoningCitation[] = [];

  for (const c of tk.citations) {
    citations.push({
      type: c.type === "CASE" ? "CASE" : c.type === "RULE" || c.type === "METHOD" ? "RULE" : "CASE",
      ref: c.code,
      title: `引用 ${c.code}${c.label ? ` ${c.label}` : ""}`,
      weightStars: 5,
      snippet: c.label,
    });
  }

  for (const r of tk.matchedRules) {
    citations.push({
      type: "RULE",
      ref: r.ruleCode,
      title: `引用 ${r.ruleCode}`,
      weightStars: 5,
      snippet: `${r.conclusion.slice(0, 100)}｜原话：${r.sourceQuote.slice(0, 80)}`,
    });
  }
  for (const c of tk.matchedCases) {
    citations.push({
      type: "CASE",
      ref: c.caseCode,
      title: `引用 ${c.caseCode}`,
      weightStars: 5,
      snippet: c.teacherConclusion.slice(0, 120),
    });
  }

  for (const r of matchedRules) {
    let stars = 5;
    if (input.assetId) {
      const mw = marketWeights.find((m) => m.ruleCode === r.ruleCode && m.assetId === input.assetId);
      if (mw) stars = mw.weightStars;
    }
    citations.push({
      type: "RULE",
      ref: r.ruleCode,
      title: r.title,
      weightStars: stars,
      snippet: r.ruleText.slice(0, 120),
    });
  }
  for (const c of matchedCases) {
    citations.push({
      type: "CASE",
      ref: c.id,
      title: c.caseTitle,
      weightStars: 5,
      snippet: (c.teacherConclusion ?? c.question ?? "").slice(0, 120),
    });
  }
  if (graphPath.length) {
    citations.push({
      type: "GRAPH",
      ref: "graph",
      title: graphPath.join(" → "),
      weightStars: 5,
      snippet: graphPath.join(" → "),
    });
  }

  const treeHint = tree
    .filter((n) => matchedRules.some((r) => r.ruleCode === n.ruleCode) || (n.label && q.includes(n.label)))
    .slice(0, 5)
    .map((n) => n.outcomeText || n.condition || n.label)
    .filter(Boolean);

  const citationLines = tk.citations.map((c) => `引用 ${c.code}`).filter((v, i, a) => a.indexOf(v) === i);

  const analysisParts = [
    "【Teacher Knowledge】优先正式老师知识库；不使用网络自由回答；不调用未审核草稿。",
    citationLines.length ? citationLines.join("；") : "",
    tk.matchedRules.length
      ? `正式规则：${tk.matchedRules.map((r) => `${r.ruleCode} ${r.title}`).join("；")}`
      : "未命中 APPROVED TeacherRule。",
    tk.matchedCases.length
      ? `正式案例：${tk.matchedCases.map((c) => `${c.caseCode} ${c.title}`).join("；")}`
      : "",
    tk.matchedMethods.length
      ? `分析流程：${tk.matchedMethods.map((m) => m.title).join("；")}`
      : "",
    tk.conflicts.length ? `冲突提示：${tk.conflicts.map((c) => c.possibleReason).join("；")}` : "",
    tk.missingInformation.length ? `缺失信息：${tk.missingInformation.join("；")}` : "",
    matchedRules.length
      ? `内部 MasterRule：${matchedRules.map((r) => `${r.ruleCode} ${r.title}`).join("；")}`
      : "",
    matchedCases.length ? `内部 MasterCase：${matchedCases.map((c) => c.caseTitle).join("；")}` : "",
    graphPath.length ? `知识图谱路径：${graphPath.join(" → ")}` : "",
    treeHint.length ? `规则树提示：${treeHint.join(" / ")}` : "",
    voiceSignals.length ? `语气信号：${voiceSignals.join(", ")}` : "",
  ].filter(Boolean);

  return {
    analysis: analysisParts.join("\n"),
    citations,
    ruleCodes: [
      ...tk.matchedRules.map((r) => r.ruleCode),
      ...matchedRules.map((r) => r.ruleCode),
    ],
    caseIds: [...tk.matchedCases.map((c) => c.caseCode), ...matchedCases.map((c) => c.id)],
    graphPath,
    voiceSignals,
  };
}
