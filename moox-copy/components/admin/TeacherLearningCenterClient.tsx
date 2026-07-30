"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Text } from "@/components/ui";
import type {
  KnowledgeGrowthStats,
  ProgressStep,
  TeacherLessonRecord,
} from "@/lib/teacher-learning-center/types";

type LessonView = TeacherLessonRecord & { playbackUrl?: string | null };

const ACCEPT =
  ".m4a,.mp3,.wav,.aac,.flac,.ogg,.mp4,.mov,.webm,.mkv,audio/mp4,audio/mpeg,audio/wav,audio/aac,audio/flac,audio/ogg,video/mp4,video/quicktime,video/webm";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分${s}秒`;
}

function ProgressBars({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.id}>
          <div className="mb-1 flex justify-between text-body-sm">
            <span>{s.label}</span>
            <span className="text-foreground-secondary">
              {s.status === "done"
                ? "完成"
                : s.status === "pending"
                  ? "等待..."
                  : s.status === "error"
                    ? "失败"
                    : `${s.percent}%`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${
                s.status === "error" ? "bg-red-500" : "bg-primary"
              }`}
              style={{
                width: `${
                  s.status === "done" ? 100 : s.status === "pending" ? 0 : Math.max(4, s.percent)
                }%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeacherLearningCenterClient({
  initialStats,
}: {
  initialStats: KnowledgeGrowthStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [busy, setBusy] = useState(false);
  const [learning, setLearning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const estDuration = useMemo(() => {
    if (!file) return null;
    const ext = "." + (file.name.split(".").pop() || "m4a").toLowerCase();
    const bitrate: Record<string, number> = {
      ".m4a": 128000,
      ".mp3": 128000,
      ".wav": 1411000,
    };
    const bps = bitrate[ext] ?? 128000;
    return Math.round((file.size * 8) / bps);
  }, [file]);

  const pickFile = (f: File | null) => {
    setFile(f);
    setMessage(null);
  };

  const upload = async () => {
    if (!file) {
      setMessage("请先选择或拖入课程文件（优先 m4a）");
      return;
    }
    setBusy(true);
    setMessage("上传中…");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/teacher-learning/lessons", { method: "POST", body: fd });
      const json = (await res.json()) as { lesson?: LessonView; error?: string };
      if (!res.ok) throw new Error(json.error || "上传失败");
      setLesson(json.lesson!);
      setFile(null);
      setMessage("上传完成，点击「开始学习」");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  const poll = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/teacher-learning/lessons/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { lesson: LessonView };
    setLesson(json.lesson);
    return json.lesson;
  }, []);

  useEffect(() => {
    if (!learning || !lesson?.id) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const latest = await poll(lesson.id);
      if (!latest || cancelled) return;
      if (latest.status === "READY" || latest.status === "PUBLISHED" || latest.status === "FAILED") {
        setLearning(false);
        setMessage(
          latest.status === "FAILED"
            ? latest.errorMessage || "学习失败，可点「重新学习」"
            : "学习完成"
        );
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [learning, lesson?.id, poll]);

  const startLearn = async (action: "learn" | "relearn" | "re-ai" = "learn") => {
    if (!lesson) return;
    setLearning(true);
    setMessage(action === "learn" ? "开始学习…" : action === "relearn" ? "重新学习…" : "重新AI整理…");
    try {
      const res = await fetch(`/api/admin/teacher-learning/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { lesson?: LessonView; error?: string };
      if (!res.ok) throw new Error(json.error || "失败");
      setLesson(json.lesson!);
      if (json.lesson!.status === "READY" || json.lesson!.status === "FAILED") {
        setLearning(false);
      }
    } catch (err) {
      setLearning(false);
      setMessage(err instanceof Error ? err.message : "失败");
    }
  };

  const publish = async () => {
    if (!lesson) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/teacher-learning/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const json = (await res.json()) as {
        lesson?: LessonView;
        error?: string;
        rulesAdded?: number;
        casesAdded?: number;
      };
      if (!res.ok) throw new Error(json.error || "加入知识库失败");
      if (json.lesson) setLesson(json.lesson);
      setMessage(
        `已加入知识库：规则 ${json.rulesAdded ?? 0} · 案例 ${json.casesAdded ?? 0}`
      );
      const st = await fetch("/api/admin/teacher-learning/stats", { cache: "no-store" }).then((r) =>
        r.json()
      );
      if (st.stats) setStats(st.stats);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "加入知识库失败");
    } finally {
      setBusy(false);
    }
  };

  const seekTo = (sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = sec;
    void el.play();
  };

  const exportTxt = () => {
    if (!lesson?.rawText) return;
    const blob = new Blob([lesson.rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lesson.title || "raw"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showResult =
    lesson &&
    (lesson.status === "READY" || lesson.status === "PUBLISHED") &&
    lesson.rawText &&
    !learning;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 text-body-sm">
        <Link href="/admin/teacher-learning/manage" className="underline underline-offset-2">
          课程管理
        </Link>
        <Link href="/admin/teacher-learning/search" className="underline underline-offset-2">
          老师知识搜索
        </Link>
        <Link href="/admin/teacher-learning/logs" className="underline underline-offset-2">
          老师学习日志
        </Link>
      </div>

      <Card padding="md" className="grid gap-3 sm:grid-cols-5">
        <Stat label="老师课程" value={`${stats.lessonCount}节`} />
        <Stat label="累计学习" value={`${stats.learningHours}小时`} />
        <Stat label="规则" value={`${stats.ruleCount}条`} />
        <Stat label="案例" value={`${stats.caseCount}个`} />
        <Stat label="经典原话" value={`${stats.quoteCount}条`} />
      </Card>

      {!showResult ? (
        <>
          <Card padding="lg" className="space-y-4">
            <Text variant="body" weight="semibold">
              上传课程
            </Text>
            <Text variant="body-sm" color="secondary">
              优先 m4a（微信导出录音）。另支持 mp3 / wav / aac / flac / ogg / mp4 / mov / webm / mkv。单文件 ≤500MB，最长约 4 小时。
            </Text>
            <div
              className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-8 transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border/[0.2]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <Text variant="body-sm" color="secondary">
                点击上传，或拖拽文件到此处
              </Text>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={ACCEPT}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {file ? (
              <div className="space-y-1 text-body-sm">
                <p>文件名：{file.name}</p>
                <p>大小：{formatBytes(file.size)}</p>
                <p>预计时长：{formatDuration(estDuration)}</p>
              </div>
            ) : null}

            {!lesson ? (
              <Button type="button" disabled={busy || !file} onClick={upload}>
                {busy ? "上传中…" : "上传"}
              </Button>
            ) : null}

            {lesson && lesson.status === "UPLOADED" && !learning ? (
              <div className="space-y-2">
                <Text variant="body-sm">
                  已上传：{lesson.fileName} · {formatBytes(lesson.fileSize)} · 预计{" "}
                  {formatDuration(lesson.durationSec)}
                </Text>
                <Button type="button" onClick={() => startLearn("learn")}>
                  开始学习
                </Button>
              </div>
            ) : null}

            {lesson?.status === "FAILED" ? (
              <div className="space-y-2">
                <Text variant="body-sm" className="text-red-600">
                  {lesson.errorMessage || "学习失败"}
                </Text>
                <Button type="button" onClick={() => startLearn("relearn")}>
                  重新学习
                </Button>
              </div>
            ) : null}

            {(learning ||
              (lesson &&
                !["UPLOADED", "READY", "PUBLISHED", "FAILED"].includes(lesson.status))) &&
            lesson ? (
              <div className="space-y-3">
                <Text variant="body" weight="semibold">
                  学习进度
                </Text>
                <ProgressBars steps={lesson.progress} />
              </div>
            ) : null}

            {message ? (
              <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                {message}
              </Text>
            ) : null}
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => startLearn("relearn")}>
              重新学习
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => startLearn("re-ai")}>
              重新AI整理
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setLesson(null);
                setMessage(null);
              }}
            >
              再传一节课
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Card padding="md" className="space-y-3">
              <Text variant="body" weight="semibold">
                播放器
              </Text>
              {lesson.playbackUrl ? (
                <audio ref={audioRef} controls className="w-full" src={lesson.playbackUrl} />
              ) : (
                <Text variant="body-sm" color="secondary">
                  无播放地址
                </Text>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => audioRef.current?.play()}>
                  播放
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => audioRef.current?.pause()}>
                  暂停
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime += 15;
                  }}
                >
                  快进 15s
                </Button>
              </div>
              <div className="max-h-48 space-y-1 overflow-auto text-caption">
                {lesson.segments.map((seg, i) => (
                  <button
                    key={i}
                    type="button"
                    className="block w-full text-left hover:text-primary"
                    onClick={() => seekTo(seg.start)}
                  >
                    [{formatDuration(Math.floor(seg.start))}] {seg.text}
                  </button>
                ))}
              </div>
            </Card>

            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Text variant="body" weight="semibold">
                  原始文字
                </Text>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(lesson.rawText)}
                  >
                    复制
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={exportTxt}>
                    导出TXT
                  </Button>
                </div>
              </div>
              <Badge variant="outline">AI 不可修改</Badge>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap text-caption">
                {lesson.rawText}
              </pre>
            </Card>

            <Card padding="md" className="space-y-3">
              <Text variant="body" weight="semibold">
                AI学习结果
              </Text>
              <div>
                <Text variant="body-sm" weight="semibold">
                  课程总结
                </Text>
                <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                  {lesson.courseSummary || "—"}
                </Text>
              </div>
              <div>
                <Text variant="body-sm" weight="semibold">
                  老师核心观点
                </Text>
                <Text variant="body-sm" color="secondary" className="whitespace-pre-wrap">
                  {lesson.coreViews || "—"}
                </Text>
              </div>
              <div>
                <Text variant="body-sm" weight="semibold">
                  老师经典原话
                </Text>
                <ul className="list-disc space-y-1 pl-4 text-body-sm text-foreground-secondary">
                  {(lesson.classicQuotes.length ? lesson.classicQuotes : ["—"]).map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card padding="md" className="space-y-3">
              <Text variant="body" weight="semibold">
                知识提炼
              </Text>
              <SectionBlock title="老师规则">
                {lesson.draftRules.map((r, i) => (
                  <div key={i} className="mb-2 border-b border-border/[0.06] pb-2 text-body-sm">
                    <p>编号：Rule{String(i + 1).padStart(4, "0")}（加入知识库后正式编号）</p>
                    <p>标题：{r.title}</p>
                    <p>内容：{r.content}</p>
                    <p>来源：第{r.sourceMinute}分钟</p>
                    <p>可信度：{r.confidence}</p>
                  </div>
                ))}
              </SectionBlock>
              <SectionBlock title="老师案例">
                {lesson.draftCases.map((c, i) => (
                  <div key={i} className="mb-2 border-b border-border/[0.06] pb-2 text-body-sm">
                    <p>案例：{c.assetName}</p>
                    <p>问题：{c.question}</p>
                    <p>老师结论：{c.teacherConclusion}</p>
                    <p>对应原文：{c.sourceText}</p>
                  </div>
                ))}
              </SectionBlock>
              <SectionBlock title="老师概念">
                {lesson.draftConcepts.map((c, i) => (
                  <p key={i} className="text-body-sm">
                    {c.title}：{c.content}
                  </p>
                ))}
              </SectionBlock>
              <SectionBlock title="老师口诀">
                {lesson.draftMnemonics.map((c, i) => (
                  <p key={i} className="text-body-sm">
                    {c.title}：{c.content}
                  </p>
                ))}
              </SectionBlock>
              <SectionBlock title="老师例外">
                {lesson.draftExceptions.map((c, i) => (
                  <p key={i} className="text-body-sm">
                    {c.title}：{c.content}
                  </p>
                ))}
              </SectionBlock>
              <SectionBlock title="老师预测">
                {lesson.draftPredictions.map((c, i) => (
                  <p key={i} className="text-body-sm">
                    {c.title}：{c.content}
                  </p>
                ))}
              </SectionBlock>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lesson.status !== "PUBLISHED" ? (
              <Button type="button" disabled={busy} onClick={publish}>
                加入知识库
              </Button>
            ) : (
              <Badge variant="outline">已加入知识库</Badge>
            )}
            {message ? (
              <Text variant="body-sm" color="secondary">
                {message}
              </Text>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text variant="caption" color="tertiary">
        {label}
      </Text>
      <Text variant="body" weight="semibold">
        {value}
      </Text>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Text variant="body-sm" weight="semibold">
        {title}
      </Text>
      <div className="mt-1">{children}</div>
    </div>
  );
}
