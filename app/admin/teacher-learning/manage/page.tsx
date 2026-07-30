"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

type Lesson = {
  id: string;
  title: string;
  fileName: string;
  status: string;
  createdAt: string;
  durationSec: number | null;
};

export default function TeacherLearningManagePage() {
  const [q, setQ] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/teacher-learning/lessons", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { lessons: Lesson[] };
    setLessons(json.lessons || []);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = lessons.filter(
    (l) =>
      !q.trim() ||
      l.title.includes(q) ||
      l.fileName.includes(q) ||
      l.id.includes(q)
  );

  async function act(id: string, action: "relearn" | "re-ai" | "delete") {
    setMsg(null);
    if (action === "delete") {
      const res = await fetch(`/api/admin/teacher-learning/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMsg("删除失败");
        return;
      }
      await load();
      setMsg("已删除");
      return;
    }
    const res = await fetch(`/api/admin/teacher-learning/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(json.error || "操作失败");
      return;
    }
    setMsg(action === "relearn" ? "已重新学习" : "已重新AI整理");
    await load();
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-learning" />
        <Heading as="h1" size="h2">
          课程管理
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          搜索、删除、重新学习、重新AI整理。
        </Text>
        <Link href="/admin/teacher-learning" className="mb-4 inline-block text-body-sm underline">
          ← 返回老师学习中心
        </Link>
        <input
          className="mb-4 w-full max-w-md rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
          placeholder="搜索课程"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {msg ? (
          <Text variant="body-sm" color="secondary" className="mb-3">
            {msg}
          </Text>
        ) : null}
        <div className="space-y-3">
          {filtered.map((l) => (
            <Card key={l.id} padding="md" className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Text variant="body-sm" weight="semibold">
                  {l.title || l.fileName}
                </Text>
                <Text variant="caption" color="tertiary" className="block">
                  {l.status} · {l.createdAt}
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => act(l.id, "relearn")}>
                  重新学习
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => act(l.id, "re-ai")}>
                  重新AI整理
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => act(l.id, "delete")}>
                  删除课程
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
