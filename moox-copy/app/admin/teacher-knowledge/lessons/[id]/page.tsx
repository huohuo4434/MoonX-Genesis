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
};

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
        `已生成草稿：规则 ${json.extracted?.counts?.rules ?? 0} · 案例 ${json.extracted?.counts?.cases ?? 0}（未入库正式库）`
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
      </Section>
    </main>
  );
}
