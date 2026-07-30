"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";

export function KnowledgeBoardClient({
  view,
}: {
  view: "conflicts" | "graph" | "rule-tree" | "reason";
}) {
  const [data, setData] = useState<unknown>(null);
  const [query, setQuery] = useState("兄弟持世 财伏藏");
  const [result, setResult] = useState<string>("");

  async function load() {
    if (view === "reason") return;
    const res = await fetch(`/api/admin/knowledge?view=${view === "conflicts" ? "conflicts" : view}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    setData(await res.json());
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load by view
  }, [view]);

  async function resolveConflict(id: string) {
    await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "resolve" }),
    });
    await load();
  }

  async function runReason() {
    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
  }

  if (view === "reason") {
    return (
      <div className="space-y-4">
        <textarea
          className="min-h-24 w-full rounded-md border border-border/[0.12] bg-background p-3 text-body-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="button" onClick={runReason}>
          运行 Teacher Reasoning
        </Button>
        <pre className="overflow-auto rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
          {result || "结果将显示引用 Rule / Case / Graph"}
        </pre>
      </div>
    );
  }

  if (view === "conflicts") {
    const conflicts = (data as { conflicts?: Array<{
      id: string;
      ruleCodeOrMotif: string;
      leftText: string;
      rightText: string;
      hypothesizedCause: string | null;
      status: string;
    }> })?.conflicts ?? [];
    return (
      <div className="space-y-3">
        {conflicts.map((c) => (
          <Card key={c.id} padding="md" className="space-y-2">
            <div className="flex gap-2">
              <Badge variant="outline">{c.ruleCodeOrMotif}</Badge>
              <Badge variant="outline">{c.status}</Badge>
            </div>
            <Text variant="caption" color="secondary" className="block whitespace-pre-wrap">
              A: {c.leftText}
            </Text>
            <Text variant="caption" color="secondary" className="block whitespace-pre-wrap">
              B: {c.rightText}
            </Text>
            <Text variant="caption" color="tertiary">
              {c.hypothesizedCause}
            </Text>
            {c.status === "OPEN" ? (
              <Button type="button" size="sm" onClick={() => resolveConflict(c.id)}>
                确认处理
              </Button>
            ) : null}
          </Card>
        ))}
        {!conflicts.length ? <Text variant="body-sm" color="secondary">暂无冲突</Text> : null}
      </div>
    );
  }

  return (
    <pre className="overflow-auto rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
