"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";

type Note = {
  id: string;
  sourceAudio: string;
  rawText: string;
  summary: string;
  rules: Record<string, string | undefined> | null;
  cases: Array<{
    question: string;
    hexagram: string;
    teacherJudgment: string;
    actualResult: string;
  }>;
  knowledge: Array<{
    category: string;
    topic: string;
    rule: string;
    example: string;
    keywords: string[];
  }>;
  keywords: string[];
  status: string;
  progress: number;
  errorMessage: string | null;
  createdTime: string;
};

export function TeacherVoiceLearningClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("美光走势");
  const [searchHits, setSearchHits] = useState<unknown>(null);
  const [fbPrediction, setFbPrediction] = useState("");
  const [fbActual, setFbActual] = useState("");
  const [fbCorrect, setFbCorrect] = useState(true);
  const [accuracy, setAccuracy] = useState<{ total: number; correct: number; wrong: number; accuracy: number | null } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/teacher-notes", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { notes: Note[] };
    setNotes(json.notes);
  }, []);

  const pollActive = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/teacher-notes/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { note: Note };
    setNotes((prev) => {
      const others = prev.filter((n) => n.id !== id);
      return [json.note, ...others];
    });
    return json.note;
  }, []);

  useEffect(() => {
    void refresh();
    void fetch("/api/admin/teacher-notes/search", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setAccuracy(j.accuracy ?? null))
      .catch(() => null);
  }, [refresh]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const note = await pollActive(activeId);
      if (!note || cancelled) return;
      if (note.status === "READY" || note.status === "FAILED") {
        setBusy(false);
        setActiveId(null);
        setMessage(note.status === "READY" ? "学习完成" : note.errorMessage || "失败");
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId, pollActive]);

  async function upload() {
    if (!file) {
      setMessage("请选择 mp3 / m4a / wav / mp4");
      return;
    }
    setBusy(true);
    setMessage("上传中…");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/teacher-notes", { method: "POST", body: fd });
      const json = (await res.json()) as { id?: string; error?: string; message?: string; status?: string };
      if (!res.ok) throw new Error(json.error || "上传失败");
      setActiveId(json.id || null);
      setMessage(json.message || "已开始 Whisper 转写与 AI 学习");
      setFile(null);
      await refresh();
      if (json.status === "READY" || json.status === "FAILED") {
        setBusy(false);
        setActiveId(null);
      }
    } catch (err) {
      setBusy(false);
      setMessage(err instanceof Error ? err.message : "上传失败");
    }
  }

  async function runSearch() {
    const res = await fetch(`/api/admin/teacher-notes/search?q=${encodeURIComponent(searchQ)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    setSearchHits(await res.json());
  }

  async function submitFeedback() {
    const res = await fetch("/api/admin/teacher-notes/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prediction: fbPrediction,
        actual: fbActual,
        correct: fbCorrect,
        query: searchQ,
      }),
    });
    const json = (await res.json()) as { reviewNote?: string; error?: string };
    if (!res.ok) {
      setMessage(json.error || "反馈失败");
      return;
    }
    setMessage(json.reviewNote || "已记录复盘");
    const acc = await fetch("/api/admin/teacher-notes/search", { cache: "no-store" }).then((r) => r.json());
    setAccuracy(acc.accuracy ?? null);
  }

  const active = activeId ? notes.find((n) => n.id === activeId) : notes[0];

  return (
    <div className="space-y-8">
      <Card padding="lg" className="space-y-4 border-border/[0.08]">
        <Text variant="body" weight="semibold">
          上传老师语音（mp3 / m4a / wav / mp4）
        </Text>
        <input
          type="file"
          accept=".mp3,.m4a,.wav,.mp4,audio/mpeg,audio/mp4,audio/wav,video/mp4"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" disabled={busy} onClick={upload}>
          {busy ? "处理中…" : "上传并自动学习"}
        </Button>
        {busy || active?.status === "TRANSCRIBING" || active?.status === "LEARNING" ? (
          <div className="space-y-2">
            <Text variant="body-sm" color="secondary">
              转换进度：{active?.progress ?? 0}% · {active?.status ?? "…"}
            </Text>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.max(5, active?.progress ?? 5)}%` }}
              />
            </div>
          </div>
        ) : null}
        {message ? (
          <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
            {message}
          </Text>
        ) : null}
      </Card>

      {active?.rawText ? (
        <Card padding="lg" className="space-y-2">
          <Text variant="body" weight="semibold">
            原始文字结果（Raw）
          </Text>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
            {active.rawText}
          </pre>
          {active.summary ? (
            <Text variant="body-sm" color="secondary">
              {active.summary}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {active?.status === "READY" ? (
        <Card padding="lg" className="space-y-3">
          <Text variant="body" weight="semibold">
            【老师核心理论】
          </Text>
          <ul className="space-y-1 text-body-sm text-foreground-secondary">
            {Object.entries(active.rules || {}).map(([k, v]) => (
              <li key={k}>
                {k}：{v}
              </li>
            ))}
          </ul>
          <Text variant="body" weight="semibold">
            【案例分析】
          </Text>
          {active.cases.map((c, i) => (
            <div key={i} className="rounded-md border border-border/[0.08] p-3 text-body-sm">
              <p>问题：{c.question}</p>
              <p>卦象：{c.hexagram}</p>
              <p>老师判断：{c.teacherJudgment}</p>
              <p>实际结果：{c.actualResult}</p>
            </div>
          ))}
          <Text variant="body" weight="semibold">
            【可调用知识】JSON
          </Text>
          <pre className="max-h-64 overflow-auto rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
            {JSON.stringify(active.knowledge, null, 2)}
          </pre>
        </Card>
      ) : null}

      <Card padding="lg" className="space-y-3">
        <Text variant="body" weight="semibold">
          知识库搜索（优先老师案例）
        </Text>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[220px] flex-1 rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="例如：美光走势"
          />
          <Button type="button" size="sm" onClick={runSearch}>
            搜索
          </Button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-md border border-border/[0.08] bg-muted/20 p-3 text-caption">
          {searchHits ? JSON.stringify(searchHits, null, 2) : "输入问题后搜索美光 / 半导体 / 财爻 / 兄弟持世等"}
        </pre>
      </Card>

      <Card padding="lg" className="space-y-3">
        <Text variant="body" weight="semibold">
          学习反馈 / 复盘
        </Text>
        {accuracy ? (
          <Text variant="body-sm" color="secondary">
            样本 {accuracy.total} · 正确 {accuracy.correct} · 错误 {accuracy.wrong}
            {accuracy.accuracy != null ? ` · 准确率 ${(accuracy.accuracy * 100).toFixed(1)}%` : ""}
          </Text>
        ) : null}
        <input
          className="w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
          placeholder="预测"
          value={fbPrediction}
          onChange={(e) => setFbPrediction(e.target.value)}
        />
        <input
          className="w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
          placeholder="实际"
          value={fbActual}
          onChange={(e) => setFbActual(e.target.value)}
        />
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" checked={fbCorrect} onChange={(e) => setFbCorrect(e.target.checked)} />
          正确
        </label>
        <Button type="button" size="sm" onClick={submitFeedback} disabled={!fbPrediction || !fbActual}>
          记录复盘
        </Button>
      </Card>

      <section className="space-y-3">
        <Text variant="body" weight="semibold">
          teacher_notes 列表
        </Text>
        {notes.map((n) => (
          <Card key={n.id} padding="md" className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Text variant="body-sm" weight="semibold">
                {n.id}
              </Text>
              <Text variant="caption" color="tertiary" className="block">
                {n.createdTime} · {n.summary || "未学习完成"}
              </Text>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{n.status}</Badge>
              <Badge variant="outline">{n.progress}%</Badge>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
