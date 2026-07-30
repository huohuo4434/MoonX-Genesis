"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

export default function TeacherKnowledgeSearchPage() {
  const [q, setQ] = useState("兄弟持世");
  const [result, setResult] = useState<unknown>(null);

  async function search() {
    const res = await fetch(`/api/admin/teacher-learning/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    setResult(await res.json());
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-learning" />
        <Heading as="h1" size="h2">
          老师知识搜索
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          搜索所有课程、案例、规则。
        </Text>
        <Link href="/admin/teacher-learning" className="mb-4 inline-block text-body-sm underline">
          ← 返回老师学习中心
        </Link>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="min-w-[220px] flex-1 rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例如：兄弟持世"
          />
          <Button type="button" onClick={search}>
            搜索
          </Button>
        </div>
        <Card padding="md">
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap text-caption">
            {result ? JSON.stringify(result, null, 2) : "输入关键词后搜索"}
          </pre>
        </Card>
      </Section>
    </main>
  );
}
