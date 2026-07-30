"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";

type Candidate = {
  id: string;
  kind: string;
  title: string;
  body: string;
  reviewStatus: string;
  weightStars: number;
  publishedRef: string | null;
};

export function KnowledgeCandidatesClient() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/knowledge/candidates", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { candidates: Candidate[] };
    setRows(json.candidates);
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, action: "publish" | "reject") {
    setBusy(id);
    try {
      await fetch("/api/admin/knowledge/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <Text variant="body-sm" color="secondary">
          暂无候选。上传课程并完成拆解后会出现。
        </Text>
      ) : (
        rows.map((c) => (
          <Card key={c.id} padding="md" className="space-y-2 border-border/[0.08]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{c.kind}</Badge>
              <Badge variant="outline">{c.reviewStatus}</Badge>
              <Badge variant="outline">{"★".repeat(c.weightStars)}</Badge>
              {c.publishedRef ? <Badge variant="outline">{c.publishedRef}</Badge> : null}
            </div>
            <Text variant="body-sm" weight="semibold">
              {c.title}
            </Text>
            <Text variant="caption" color="secondary" className="block whitespace-pre-wrap">
              {c.body}
            </Text>
            {c.reviewStatus === "DRAFT" || c.reviewStatus === "APPROVED" ? (
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy === c.id} onClick={() => act(c.id, "publish")}>
                  审核通过并发布
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, "reject")}>
                  拒绝
                </Button>
              </div>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
