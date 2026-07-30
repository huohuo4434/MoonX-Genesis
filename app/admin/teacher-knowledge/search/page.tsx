"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

export default function TeacherKnowledgeSearchPage() {
  const [q, setQ] = useState("兄弟持世");
  const [status, setStatus] = useState("");
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [asset, setAsset] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<unknown>(null);

  async function search() {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (approvedOnly) sp.set("approvedOnly", "1");
    if (asset) sp.set("asset", asset);
    if (category) sp.set("category", category);
    const res = await fetch(`/api/admin/teacher-knowledge/search?${sp}`, { cache: "no-store" });
    if (!res.ok) return;
    setResult(await res.json());
  }

  const rules = (result as { rules?: Array<Record<string, unknown>> } | null)?.rules || [];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          老师知识搜索
        </Heading>
        <Link href="/admin/teacher-knowledge" className="mb-4 mt-2 inline-block text-body-sm underline">
          ← 老师知识库
        </Link>

        <Card padding="md" className="mb-4 space-y-3">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="关键词 / 规则编号 / 原话" />
          <div className="flex flex-wrap gap-2">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="APPROVED">仅正式</option>
              <option value="DRAFT">仅草稿</option>
            </select>
            <input className={inputCls} value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="按资产" />
            <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="按分类 USE_GOD…" />
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" checked={approvedOnly} onChange={(e) => setApprovedOnly(e.target.checked)} />
              仅正式规则
            </label>
            <Button type="button" onClick={search}>
              搜索
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={String(r.id)} padding="md">
              <Text variant="body-sm" weight="semibold">
                {String(r.ruleCode)} · {String(r.title)} · {String(r.status)}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-1 block">
                结论：{String(r.conclusion)}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                条件：{Array.isArray(r.conditions) ? r.conditions.join("；") : "—"} · 例外：
                {Array.isArray(r.exceptions) ? r.exceptions.join("；") : "—"}
              </Text>
              <Text variant="caption" color="tertiary" className="mt-1 block">
                老师原话：{String(r.sourceQuote)}
              </Text>
            </Card>
          ))}
        </div>

        <Card padding="md" className="mt-4">
          <pre className="max-h-96 overflow-auto text-caption">{result ? JSON.stringify(result, null, 2) : "搜索结果 JSON"}</pre>
        </Card>
      </Section>
    </main>
  );
}

const inputCls = "rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm";
