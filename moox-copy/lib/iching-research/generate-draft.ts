/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { prisma } from "@/lib/prisma";
import type { IChingResearchStatus } from "./types";

type DraftStep = { step: number; title: string; content: string };

function asIsoDate(d: string | null | undefined) {
  if (!d) return "";
  return d;
}

function jsonPretty(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export async function generateIChingAnalysisDraftForAdmin(researchId: string, changedBy?: string | null) {
  if (!prisma) throw new Error("Prisma is not configured");

  const r = await prisma.iChingResearch.findUnique({
    where: { id: researchId },
  });
  if (!r) throw new Error("IChingResearch not found");

  const rules = await prisma.masterRule.findMany({
    where: { status: { in: ["ACTIVE", "DRAFT"] } },
  });

  const rulesActive = rules.filter((x) => x.status === "ACTIVE").length;
  const rulesAll = rules.length;
  const hasAnyRules = rulesAll > 0;
  const allDraft = hasAnyRules && rulesActive === 0;

  const disclaimerNoRule =
    "当前尚未建立完整老师规则库，本分析仅为内部研究草稿。";
  const disclaimerDraft =
    "DRAFT：尚待老师原始课程逐条确认。当前草稿仅用于内部参考，不得冒充老师结论。";

  const steps: DraftStep[] = [];

  const add = (step: number, title: string, content: string) => steps.push({ step, title, content });

  add(1, "问题与预测周期", `${r.question}\n\n预测周期：${r.forecastType}\n开始：${asIsoDate(r.forecastStartAt)}\n结束：${asIsoDate(r.forecastEndAt)}`);
  add(2, "定用神", r.usefulGod ? `用神：${r.usefulGod}` : "用神：待填（usefulGod 为空）");
  add(3, "月建旺衰", r.monthStemBranch ? `月建：${r.monthStemBranch}` : "月建：待填（monthStemBranch 为空）");
  add(4, "日辰作用", r.dayStemBranch ? `日辰：${r.dayStemBranch}` : "日辰：待填（dayStemBranch 为空）");
  add(5, "旬空", r.emptyBranches && Array.isArray(r.emptyBranches) ? `旬空：${jsonPretty(r.emptyBranches)}` : "旬空：待填（emptyBranches 为空）");
  add(6, "世爻", r.worldLine ? `世爻（JSON）：${jsonPretty(r.worldLine)}` : "世爻：待填（worldLine 为空）");
  add(7, "应爻", r.responseLine ? `应爻（JSON）：${jsonPretty(r.responseLine)}` : "应爻：待填（responseLine 为空）");
  add(8, "妻财", r.lineData ? `妻财线索（从 lineData 读取）：\n${jsonPretty(r.lineData)}` : "妻财：待填（lineData 为空）");
  add(9, "兄弟", "兄弟：待填（请在 lineData 逐爻标注六亲/旺衰/伏飞神）");
  add(10, "官鬼", "官鬼：待填");
  add(11, "子孙", "子孙：待填");
  add(12, "父母", "父母：待填");
  add(13, "伏神与飞神", "伏神/飞神：待填（在 lineData 内填写 hiddenSpirit/flyingSpirit）");
  add(
    14,
    "动爻与变爻",
    `动爻（movingLines）：${jsonPretty(r.movingLines)}\n变卦：${r.changedHexagramName ?? "无变卦"}`.trim()
  );
  add(15, "化进、化退", "化进/化退：待填（在 lineData 内填写 changedRelation/changedElement，并由教师规则判定）");
  add(16, "回头生、回头克", "回头生/回头克：待填（在 lineData 内填写 isReturnGenerate/isReturnOvercome）");
  add(17, "合、冲、墓、破", "合冲墓破：待填（在 lineData 内或通过 notes 填写）");
  add(18, "时间窗口", r.timeWindows ? `时间窗口：${jsonPretty(r.timeWindows)}` : "时间窗口：待填（timeWindows 为空）");
  add(19, "走势路径", r.internalPathConclusion ? `路径：${r.internalPathConclusion}` : "路径：待填（internalPathConclusion 为空）");
  add(20, "明确方向结论", r.internalDirectionConclusion ? `方向：${r.internalDirectionConclusion}` : "方向：待填（internalDirectionConclusion 为空）");
  add(21, "失效条件", "失效条件：待填（依赖教师规则库中的 EXCEPTION/VALIDATION 条款）");
  add(
    22,
    "等待老师确认状态",
    `当前研究状态：${r.researchStatus as IChingResearchStatus}\n${!hasAnyRules ? disclaimerNoRule : allDraft ? disclaimerDraft : "规则库存在：生成草稿仍不发布最终结论。"}`
  );

  const internalAnalysisDraft = steps.map((s) => `【${s.step}. ${s.title}】\n${s.content}`).join("\n\n");

  const patch = {
    internalAnalysis: internalAnalysisDraft,
    analysisSteps: steps.map((s) => ({ title: s.title, step: s.step, content: s.content })),
  };

  // Generate draft only — do NOT change adoptedSource/结论字段 by default.
  // Keep masterOriginalAnalysis unchanged.
  const updated = await prisma.iChingResearch.update({
    where: { id: researchId },
    data: {
      ...patch,
      updatedBy: changedBy ?? undefined,
      // Keep status; but if it's DRAFT, keep DRAFT. Otherwise leave.
    } as any,
  });

  return { ok: true, researchId, stepsCount: steps.length, updated };
}

