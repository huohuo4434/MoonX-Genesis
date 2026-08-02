import "server-only";

import { listIChingResearchForAdmin, type IChingResearchListFilter } from "@/lib/iching-research/store";
import { prisma } from "@/lib/prisma";
import {
  listCases as listTeacherCases,
  listLessons as listTeacherLessons,
  listRules as listTeacherRules,
} from "@/lib/teacher-knowledge/store";

export type AdminKnowledgeSource = "PRIMARY_DATABASE" | "TEACHER_KNOWLEDGE_FALLBACK";

export type AdminKnowledgeLoad<T> = {
  items: T[];
  source: AdminKnowledgeSource;
  warning: string | null;
};

export type AdminIChingLibraryRow = {
  id: string;
  assetId: string;
  question: string;
  forecastType: string;
  forecastStartAt: string;
  forecastEndAt: string;
  castAt: string;
  sourceType: string;
  adoptedSource: string;
  hexagramName: string;
  changedHexagramName: string | null;
  researchStatus: string;
  verifiedLabel: string;
  version: number;
  editHref: string;
};

export type AdminIChingRuleRow = {
  id: string;
  ruleCode: string;
  title: string;
  category: string;
  priority: number;
  status: string;
  updatedAt: string;
  editHref: string;
};

export type AdminIChingCaseRow = {
  id: string;
  assetId: string;
  title: string;
  forecastStartAt: string;
  forecastEndAt: string;
  validationStatus: string;
  validationScore: number | null;
  relationLabel: string;
  editHref: string | null;
};

export type AdminIChingValidationRow = {
  id: string;
  researchId: string;
  result: string;
  actualDirection: string | null;
  actualPath: string | null;
  totalScore: number | null;
  directionScore: number | null;
  timingScore: number | null;
  verifiedAt: string | null;
  editHref: string | null;
};

function errorForLog(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function fallbackWarning(section: string): string {
  return `${section}主数据表暂不可用，当前已自动切换到“老师知识库”兼容数据。页面仍可浏览和维护，不会再因数据库表缺失而整页报错。`;
}

function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export async function loadAdminIChingLibrary(
  filter: IChingResearchListFilter
): Promise<AdminKnowledgeLoad<AdminIChingLibraryRow>> {
  try {
    const rows = await listIChingResearchForAdmin(filter);
    return {
      source: "PRIMARY_DATABASE",
      warning: null,
      items: rows.map((row) => ({
        id: row.id,
        assetId: row.assetId,
        question: row.question ?? "",
        forecastType: row.forecastType,
        forecastStartAt: row.forecastStartAt,
        forecastEndAt: row.forecastEndAt,
        castAt: iso(row.castAt),
        sourceType: row.sourceType,
        adoptedSource: row.adoptedSource,
        hexagramName: row.hexagramName,
        changedHexagramName: row.changedHexagramName,
        researchStatus: row.researchStatus,
        verifiedLabel: row.validations?.[0]?.result ? "已验证" : "未验证",
        version: row.version ?? 1,
        editHref: `/admin/iching/library/${encodeURIComponent(row.id)}`,
      })),
    };
  } catch (error) {
    console.error("[admin-iching] library primary unavailable", errorForLog(error));
  }

  const lessons = await listTeacherLessons();
  const query = filter.questionQuery?.trim().toLowerCase();
  const filtered = lessons.filter((lesson) => {
    if (filter.assetId && !lesson.assets.some((asset) => asset.toLowerCase() === filter.assetId?.toLowerCase())) {
      return false;
    }
    if (query) {
      const haystack = [lesson.title, lesson.summary, lesson.rawTranscript, ...lesson.tags]
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return {
    source: "TEACHER_KNOWLEDGE_FALLBACK",
    warning: fallbackWarning("六爻研究库"),
    items: filtered.map((lesson) => ({
      id: lesson.id,
      assetId: lesson.assets[0] ?? "综合",
      question: lesson.title,
      forecastType: lesson.timeframes.join(" / ") || "课程资料",
      forecastStartAt: lesson.lessonDate ?? "—",
      forecastEndAt: lesson.lessonDate ?? "—",
      castAt: lesson.createdAt,
      sourceType: "老师知识库",
      adoptedSource: lesson.status,
      hexagramName: lesson.tags.find((tag) => /卦/.test(tag)) ?? "课程／规则资料",
      changedHexagramName: null,
      researchStatus: lesson.status,
      verifiedLabel: lesson.status === "APPROVED" ? "已审核" : "待审核",
      version: lesson.version,
      editHref: `/admin/teacher-knowledge/lessons/${encodeURIComponent(lesson.id)}`,
    })),
  };
}

export async function loadAdminIChingRules(): Promise<AdminKnowledgeLoad<AdminIChingRuleRow>> {
  if (prisma) {
    try {
      const rows = await prisma.masterRule.findMany({
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 300,
      });
      return {
        source: "PRIMARY_DATABASE",
        warning: null,
        items: rows.map((row) => ({
          id: row.id,
          ruleCode: row.ruleCode,
          title: row.title,
          category: row.category,
          priority: row.priority,
          status: row.status,
          updatedAt: iso(row.updatedAt),
          editHref: `/admin/iching/rules/${encodeURIComponent(row.ruleCode)}`,
        })),
      };
    } catch (error) {
      console.error("[admin-iching] rules primary unavailable", errorForLog(error));
    }
  }

  const rows = await listTeacherRules();
  return {
    source: "TEACHER_KNOWLEDGE_FALLBACK",
    warning: fallbackWarning("六爻规则"),
    items: rows.map((row) => ({
      id: row.id,
      ruleCode: row.ruleCode,
      title: row.title,
      category: row.category,
      priority: row.priority,
      status: row.status,
      updatedAt: row.updatedAt,
      editHref: `/admin/teacher-knowledge/search?q=${encodeURIComponent(row.ruleCode)}`,
    })),
  };
}

export async function loadAdminIChingCases(): Promise<AdminKnowledgeLoad<AdminIChingCaseRow>> {
  if (prisma) {
    try {
      const rows = await prisma.masterCase.findMany({
        orderBy: { forecastStartAt: "desc" },
        take: 300,
      });
      return {
        source: "PRIMARY_DATABASE",
        warning: null,
        items: rows.map((row) => ({
          id: row.id,
          assetId: row.assetId,
          title: row.caseTitle,
          forecastStartAt: row.forecastStartAt,
          forecastEndAt: row.forecastEndAt,
          validationStatus: row.validationStatus ?? "UNVERIFIED",
          validationScore: row.validationScore,
          relationLabel: row.researchId ? `关联 researchId: ${row.researchId}` : "未关联研究记录",
          editHref: null,
        })),
      };
    } catch (error) {
      console.error("[admin-iching] cases primary unavailable", errorForLog(error));
    }
  }

  const rows = await listTeacherCases();
  return {
    source: "TEACHER_KNOWLEDGE_FALLBACK",
    warning: fallbackWarning("六爻案例"),
    items: rows.map((row) => ({
      id: row.id,
      assetId: row.asset || "综合",
      title: row.title,
      forecastStartAt: row.predictionStart ?? "—",
      forecastEndAt: row.predictionEnd ?? "—",
      validationStatus: row.validationStatus || "PENDING",
      validationScore: null,
      relationLabel: row.caseCode,
      editHref: `/admin/teacher-knowledge/search?q=${encodeURIComponent(row.caseCode)}`,
    })),
  };
}

export async function loadAdminIChingValidations(): Promise<AdminKnowledgeLoad<AdminIChingValidationRow>> {
  if (prisma) {
    try {
      const rows = await prisma.iChingValidation.findMany({
        orderBy: { verifiedAt: "desc" },
        take: 300,
      });
      return {
        source: "PRIMARY_DATABASE",
        warning: null,
        items: rows.map((row) => ({
          id: row.id,
          researchId: row.researchId,
          result: row.result ?? "UNVERIFIABLE",
          actualDirection: row.actualDirection,
          actualPath: row.actualPath,
          totalScore: row.totalScore,
          directionScore: row.directionScore,
          timingScore: row.timingScore,
          verifiedAt: row.verifiedAt ? iso(row.verifiedAt) : null,
          editHref: null,
        })),
      };
    } catch (error) {
      console.error("[admin-iching] validations primary unavailable", errorForLog(error));
    }
  }

  const cases = await listTeacherCases();
  const rows = cases.filter(
    (row) => row.validationStatus && row.validationStatus !== "PENDING"
  );
  return {
    source: "TEACHER_KNOWLEDGE_FALLBACK",
    warning: fallbackWarning("六爻验证"),
    items: rows.map((row) => ({
      id: `teacher-case-${row.id}`,
      researchId: row.caseCode,
      result: row.validationStatus,
      actualDirection: row.actualResult,
      actualPath: row.validationNotes,
      totalScore: null,
      directionScore: null,
      timingScore: null,
      verifiedAt: row.updatedAt,
      editHref: `/admin/teacher-knowledge/search?q=${encodeURIComponent(row.caseCode)}`,
    })),
  };
}
