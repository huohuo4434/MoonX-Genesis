"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Text } from "@/components/ui";

type Pack = {
  lesson: {
    id: string;
    title: string;
    status: string;
    errorMessage: string | null;
  };
  transcript: { rawText: string; cleanText: string; rawLocked: boolean } | null;
  extraction: { summary: string | null; lessonOutputJson: unknown } | null;
  candidates: Array<{ id: string; kind: string; title: string; reviewStatus: string }>;
};

export function LessonDetailClient({ id }: { id: string }) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/lessons/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as Pack;
    setPack(json);
    if (!json.transcript?.rawLocked) setRaw(json.transcript?.rawText || "");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load by lesson id
  }, [id]);

  async function saveRaw() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTranscript: raw }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "保存失败");
      setMsg("Raw Transcript 已锁定保存，并生成 Clean Transcript");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function processNow() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "处理失败");
      setMsg(json.message || "已处理");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "处理失败");
    } finally {
      setBusy(false);
    }
  }

  if (!pack) {
    return <Text variant="body-sm">加载中…</Text>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{pack.lesson.status}</Badge>
        <Button type="button" size="sm" disabled={busy} onClick={processNow}>
          执行下一流水线步骤
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/knowledge/candidates">去审核候选</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/lessons">返回列表</Link>
        </Button>
      </div>
      {pack.lesson.errorMessage ? (
        <Text variant="body-sm" className="text-amber-500">
          {pack.lesson.errorMessage}
        </Text>
      ) : null}
      {msg ? (
        <Text variant="body-sm" color="secondary">
          {msg}
        </Text>
      ) : null}

      <Card padding="lg" className="space-y-3">
        <Text variant="body" weight="semibold">
          Raw Transcript（原文，锁定后不可改）
        </Text>
        {pack.transcript?.rawLocked ? (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
            {pack.transcript.rawText || "（空）"}
          </pre>
        ) : (
          <>
            <textarea
              className="min-h-40 w-full rounded-md border border-border/[0.12] bg-background p-3 text-body-sm"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="无 Whisper Key 时可粘贴老师原文；保存后永久锁定"
            />
            <Button type="button" size="sm" disabled={busy || !raw.trim()} onClick={saveRaw}>
              保存 Raw 并生成 Clean
            </Button>
          </>
        )}
      </Card>

      <Card padding="lg" className="space-y-3">
        <Text variant="body" weight="semibold">
          Clean Transcript
        </Text>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
          {pack.transcript?.cleanText || "（尚未生成）"}
        </pre>
      </Card>

      <Card padding="lg" className="space-y-3">
        <Text variant="body" weight="semibold">
          课程拆解摘要
        </Text>
        <Text variant="body-sm" color="secondary">
          {pack.extraction?.summary || "尚未拆解"}
        </Text>
        <div className="flex flex-wrap gap-2">
          {pack.candidates.map((c) => (
            <Badge key={c.id} variant="outline">
              {c.kind} · {c.reviewStatus} · {c.title.slice(0, 20)}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
