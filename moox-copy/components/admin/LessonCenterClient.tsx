"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Text } from "@/components/ui";

type Lesson = {
  id: string;
  title: string;
  teacher: string;
  course: string | null;
  lessonNumber: number | null;
  status: string;
  source: string;
  uploadTime: string;
  mediaFileName: string | null;
  errorMessage: string | null;
};

export function LessonCenterClient({ initialLessons }: { initialLessons: Lesson[] }) {
  const [lessons, setLessons] = useState(initialLessons);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("老师");
  const [course, setCourse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/lessons", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { lessons: Lesson[] };
    setLessons(json.lessons);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload() {
    if (!file) {
      setMessage("请选择音频/视频文件（推荐 MP3）");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", title || file.name);
      fd.set("teacher", teacher);
      if (course) fd.set("course", course);
      fd.set("source", "MASTER");
      const res = await fetch("/api/admin/lessons/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string; lessonId?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "上传失败");
      setMessage(json.message || "上传成功");
      setFile(null);
      setTitle("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card padding="lg" className="space-y-4 border-border/[0.08]">
        <Text variant="body" weight="semibold">
          上传课程（Lesson Center）
        </Text>
        <Text variant="body-sm" color="secondary">
          支持 MP3 / M4A / WAV / AAC / FLAC / MP4 / MOV / WEBM / MKV。推荐 MP3。上传后自动进入转录与知识拆解流水线。
        </Text>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-body-sm">
            标题
            <input
              className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="课程标题"
            />
          </label>
          <label className="block text-body-sm">
            老师
            <input
              className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            />
          </label>
          <label className="block text-body-sm">
            课程系列
            <input
              className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="例如：投资六爻系统课"
            />
          </label>
          <label className="block text-body-sm">
            媒体文件
            <input
              className="mt-1 w-full text-body-sm"
              type="file"
              accept=".mp3,.m4a,.wav,.aac,.flac,.mp4,.mov,.webm,.mkv,audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <Button type="button" disabled={busy} onClick={upload}>
          {busy ? "上传处理中…" : "上传并开始学习"}
        </Button>
        {message ? (
          <Text variant="body-sm" color="secondary">
            {message}
          </Text>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/knowledge/candidates">审核候选知识</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/knowledge/conflicts">冲突引擎</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/knowledge/graph">知识图谱</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/knowledge/rule-tree">规则树</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/knowledge/reason">Teacher Reasoning</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <Text variant="body" weight="semibold">
          课程列表
        </Text>
        {lessons.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            暂无课程。上传第一节课后将自动建立知识库草稿。
          </Text>
        ) : (
          lessons.map((l) => (
            <Card key={l.id} padding="md" className="border-border/[0.08]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/lessons/${l.id}`} className="text-body-sm font-semibold text-primary underline-offset-2 hover:underline">
                    {l.title}
                  </Link>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {l.teacher}
                    {l.course ? ` · ${l.course}` : ""}
                    {l.mediaFileName ? ` · ${l.mediaFileName}` : ""}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {l.uploadTime}
                  </Text>
                  {l.errorMessage ? (
                    <Text variant="caption" className="mt-1 block text-amber-500">
                      {l.errorMessage}
                    </Text>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{l.source}</Badge>
                  <Badge variant="outline">{l.status}</Badge>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
