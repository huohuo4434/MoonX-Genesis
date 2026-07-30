"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

type LessonRow = { id: string; lessonCode: string; title: string };
type DraftBundle = {
  lesson: { id: string; lessonCode: string; title: string; rawTranscript: string; status: string };
  drafts: {
    rules: Array<{ id: string; ruleCode: string; title: string; conclusion: string; sourceQuote: string; status: string }>;
    cases: Array<{ id: string; caseCode: string; title: string; teacherConclusion: string; sourceQuote: string; status: string; needsAdminFill?: string[] }>;
    concepts: Array<{ id: string; name: string; definition: string; sourceQuote: string; status: string }>;
    quotes: Array<{ id: string; quote: string; status: string }>;
    methods: Array<{ id: string; title: string; steps: string[]; status: string }>;
  };
};

export default function TeacherKnowledgeReviewPage() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<DraftBundle | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/teacher-knowledge/lessons", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setLessons(j.lessons || []);
        if (j.lessons?.[0]?.id) setActiveId(j.lessons[0].id);
      });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void fetch(`/api/admin/teacher-knowledge/lessons/${activeId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setBundle(j));
  }, [activeId]);

  async function review(kind: string, id: string, status: string) {
    setMsg(null);
    const res = await fetch("/api/admin/teacher-knowledge/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, status }),
    });
    if (!res.ok) {
      setMsg("操作失败");
      return;
    }
    setMsg(`${status} 已保存（无批量一键入库）`);
    if (activeId) {
      const j = await fetch(`/api/admin/teacher-knowledge/lessons/${activeId}`, { cache: "no-store" }).then((r) =>
        r.json()
      );
      setBundle(j);
    }
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          审核候选知识
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          左侧原文，右侧 AI 候选。必须逐条审核。禁止一键全部入库。
        </Text>
        <Link href="/admin/teacher-knowledge" className="mb-4 inline-block text-body-sm underline">
          ← 老师知识库
        </Link>

        <div className="mb-4 flex flex-wrap gap-2">
          {lessons.map((l) => (
            <Button
              key={l.id}
              type="button"
              size="sm"
              variant={activeId === l.id ? "primary" : "secondary"}
              onClick={() => setActiveId(l.id)}
            >
              {l.lessonCode}
            </Button>
          ))}
        </div>
        {msg ? (
          <Text variant="body-sm" color="secondary" className="mb-3">
            {msg}
          </Text>
        ) : null}

        {bundle ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="md">
              <Text variant="body" weight="semibold">
                老师原始文字 · {bundle.lesson.lessonCode}
              </Text>
              <pre className="mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap text-caption">
                {bundle.lesson.rawTranscript}
              </pre>
            </Card>
            <div className="max-h-[70vh] space-y-4 overflow-auto">
              <ReviewBlock
                title="候选规则"
                items={bundle.drafts.rules.map((r) => ({
                  id: r.id,
                  kind: "rule",
                  head: `${r.ruleCode} ${r.title}`,
                  body: `${r.conclusion}\n原话：${r.sourceQuote}`,
                  status: r.status,
                }))}
                onReview={review}
              />
              <ReviewBlock
                title="候选案例"
                items={bundle.drafts.cases.map((c) => ({
                  id: c.id,
                  kind: "case",
                  head: `${c.caseCode} ${c.title}`,
                  body: `${c.teacherConclusion}\n原话：${c.sourceQuote}${
                    c.needsAdminFill?.length ? `\n待补：${c.needsAdminFill.join(", ")}` : ""
                  }`,
                  status: c.status,
                }))}
                onReview={review}
              />
              <ReviewBlock
                title="候选概念"
                items={bundle.drafts.concepts.map((c) => ({
                  id: c.id,
                  kind: "concept",
                  head: c.name,
                  body: `${c.definition}\n原话：${c.sourceQuote}`,
                  status: c.status,
                }))}
                onReview={review}
              />
              <ReviewBlock
                title="经典原话"
                items={bundle.drafts.quotes.map((q) => ({
                  id: q.id,
                  kind: "quote",
                  head: q.quote.slice(0, 40),
                  body: q.quote,
                  status: q.status,
                }))}
                onReview={review}
              />
              <ReviewBlock
                title="分析流程"
                items={bundle.drafts.methods.map((m) => ({
                  id: m.id,
                  kind: "method",
                  head: m.title,
                  body: m.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
                  status: m.status,
                }))}
                onReview={review}
              />
            </div>
          </div>
        ) : null}
      </Section>
    </main>
  );
}

function ReviewBlock({
  title,
  items,
  onReview,
}: {
  title: string;
  items: Array<{ id: string; kind: string; head: string; body: string; status: string }>;
  onReview: (kind: string, id: string, status: string) => void;
}) {
  return (
    <Card padding="md" className="space-y-3">
      <Text variant="body" weight="semibold">
        {title}
      </Text>
      {items.length === 0 ? (
        <Text variant="body-sm" color="secondary">
          无
        </Text>
      ) : (
        items.map((item) => (
          <div key={item.id} className="rounded-md border border-border/[0.08] p-3">
            <Text variant="body-sm" weight="semibold">
              {item.head} · {item.status}
            </Text>
            <pre className="mt-1 whitespace-pre-wrap text-caption text-foreground-secondary">{item.body}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onReview(item.kind, item.id, "APPROVED")}>
                通过
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => onReview(item.kind, item.id, "REJECTED")}>
                拒绝
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => onReview(item.kind, item.id, "UNCERTAIN")}>
                标记不确定
              </Button>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
