"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Text } from "@/components/ui";

export function AdminPublishForm({
  kind,
}: {
  kind: "today" | "tomorrow" | "research";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function publish() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: title.trim(),
        body: body.trim(),
        summary: summary.trim() || undefined,
        status: "published",
      }),
    });
    const json = (await res.json()) as { error?: string; ok?: boolean };
    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? "发布失败");
      return;
    }
    setTitle("");
    setBody("");
    setSummary("");
    setMessage("发布成功");
    router.refresh();
  }

  return (
    <div className="mb-8 flex max-w-2xl flex-col gap-3 rounded-md border border-border/[0.08] p-4">
      <Text variant="body-sm" weight="semibold">
        {kind === "research" ? "发布研究文章" : kind === "today" ? "发布今日观点" : "发布明日预测"}
      </Text>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
      />
      {kind === "research" && (
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="摘要"
          className="h-10 rounded-md border border-border bg-surface px-3 text-body-sm"
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="正文"
        rows={6}
        className="rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
      />
      <Button size="sm" disabled={loading || !title.trim() || !body.trim()} onClick={publish}>
        {loading ? "发布中…" : "发布"}
      </Button>
      {message && (
        <Text variant="caption" color="tertiary">
          {message}
        </Text>
      )}
    </div>
  );
}
