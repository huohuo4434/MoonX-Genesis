"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

type Lesson = {
  id: string;
  lessonCode: string;
  title: string;
  rawTranscript: string;
  cleanedTranscript: string;
  summary: string;
  status: string;
  version: number;
  qimenShadowExtraction: unknown | null;
  automationAttemptCount?: number;
  automationNextRetryAt?: string | null;
  automationLastError?: string | null;
};

type QimenShadowReport = {
  generatedAt: string;
  modelStatus: string;
  accepted: Array<{
    schoolId: string;
    marketCode: string;
    horizon: string;
    direction: string;
    confidence: number;
    evidence?: { sourceBlockQuote?: string };
  }>;
  rejected: Array<{ schoolId: string; reason: string }>;
};

function asQimenShadowReport(value: unknown): QimenShadowReport | null {
  if (!value || typeof value !== "object") return null;
  const report = value as Partial<QimenShadowReport>;
  return typeof report.modelStatus === "string" && Array.isArray(report.accepted) && Array.isArray(report.rejected)
    ? report as QimenShadowReport
    : null;
}

export default function TeacherLessonDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/teacher-knowledge/lessons/${id}`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const json = await res.json();
      setLesson(json.lesson);
      setDrafts(json.drafts || {});
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function extract() {
    setBusy(true);
    setMsg("AI整理中…");
    try {
      const res = await fetch(`/api/admin/teacher-knowledge/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extract" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "失败");
      setMsg(
        `已生成草稿：规则 ${json.extracted?.counts?.rules ?? 0} · 案例 ${json.extracted?.counts?.cases ?? 0}；奇门 ${json.extracted?.qimenShadow?.modelStatus ?? "UNKNOWN"}，接受 ${json.extracted?.qimenShadow?.accepted ?? 0}，拒绝 ${json.extracted?.qimenShadow?.rejected ?? 0}（均未进入正式预测）`
      );
      const refreshed = await fetch(`/api/admin/teacher-knowledge/lessons/${id}`, { cache: "no-store" });
      if (refreshed.ok) {
        const body = await refreshed.json();
        setLesson(body.lesson);
        setDrafts(body.drafts || {});
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "失败");
    } finally {
      setBusy(false);
    }
  }

  if (!lesson) {
    return (
      <main>
        <Section spacing="lg">
          <AdminNav current="/admin/teacher-knowledge" />
          <Text variant="body-sm">加载中…</Text>
        </Section>
      </main>
    );
  }
  const qimenReport = asQimenShadowReport(lesson.qimenShadowExtraction);

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          {lesson.lessonCode} · {lesson.title}
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          状态 {lesson.status} · 版本 v{lesson.version}
        </Text>
        {(lesson.automationAttemptCount ?? 0) > 0 ? (
          <Text variant="body-sm" color="secondary" className="mb-4">
            {(lesson.automationAttemptCount ?? 0) >= 3
              ? "自动补偿已停止，点击“AI整理课程”可人工重试"
              : `自动补偿重试 ${lesson.automationAttemptCount}/3 · 下次 ${lesson.automationNextRetryAt || "待调度"}`}
            {lesson.automationLastError ? ` · 最近失败：${lesson.automationLastError}` : ""}
          </Text>
        ) : null}
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/admin/teacher-knowledge" className="text-body-sm underline">
            ← 知识库
          </Link>
          <Link href="/admin/teacher-knowledge/review" className="text-body-sm underline">
            去审核
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={extract}>
            AI整理课程
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("确认删除该课程？此操作不可恢复。")) return;
              setBusy(true);
              setMsg(null);
              try {
                const res = await fetch(`/api/admin/teacher-knowledge/lessons/${id}`, { method: "DELETE" });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "删除失败");
                window.location.href = "/admin/teacher-knowledge";
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "删除失败");
                setBusy(false);
              }
            }}
          >
            删除课程
          </Button>
        </div>
        {msg ? (
          <Text variant="body-sm" color="secondary" className="mb-4">
            {msg}
          </Text>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="md">
            <Text variant="body" weight="semibold">
              原始转写文字（永久只读保存）
            </Text>
            <pre className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap text-caption">
              {lesson.rawTranscript}
            </pre>
          </Card>
          <Card padding="md" className="space-y-3">
            <Text variant="body" weight="semibold">
              AI 摘要 / 草稿计数
            </Text>
            <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
              {lesson.summary || "尚未整理"}
            </Text>
            <pre className="max-h-96 overflow-auto text-caption">{JSON.stringify(drafts, null, 2)}</pre>
          </Card>
        </div>
        <Card padding="md" className="mt-4 space-y-3">
          <Text variant="body" weight="semibold">
            奇门自动提取审计（仅管理员可见 · RESEARCH_ONLY）
          </Text>
          {qimenReport ? (
            <>
              <Text variant="body-sm" color="secondary">
                模型状态 {qimenReport.modelStatus} · 接受 {qimenReport.accepted.length} · 拒绝 {qimenReport.rejected.length}
                {qimenReport.generatedAt ? ` · 完成于 ${qimenReport.generatedAt}` : ""}
              </Text>
              {qimenReport.rejected.length ? (
                <div className="space-y-2">
                  {qimenReport.rejected.map((item, index) => (
                    <div key={`${item.schoolId}-${index}`} className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-caption">
                      <strong>{item.schoolId}</strong>：{item.reason}
                    </div>
                  ))}
                </div>
              ) : null}
              {qimenReport.accepted.map((item, index) => (
                <details key={`${item.schoolId}-${item.marketCode}-${index}`} className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <summary className="cursor-pointer text-body-sm">
                    {item.schoolId} · {item.marketCode} · {item.horizon} · {item.direction} · 置信度 {item.confidence}
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-caption">
                    {item.evidence?.sourceBlockQuote || "未保存连续逐字证据块"}
                  </pre>
                </details>
              ))}
            </>
          ) : (
            <Text variant="body-sm" color="secondary">
              尚无奇门提取报告；定时补抽只会写研究证据，不会改变课程发布状态或正式预测。
            </Text>
          )}
        </Card>
      </Section>
    </main>
  );
}
