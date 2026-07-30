"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

const ASSET_OPTS = ["美光", "黄金", "比特币", "纳斯达克", "标普", "长鑫", "原油", "WTI", "半导体"];
const TF_OPTS = ["日内", "短线", "波段", "中线", "长线"];

export default function NewTeacherLessonPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [courseSeries, setCourseSeries] = useState("");
  const [lessonNumber, setLessonNumber] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [sourceType, setSourceType] = useState("AUDIO_TRANSCRIPT");
  const [assets, setAssets] = useState<string[]>([]);
  const [timeframes, setTimeframes] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  function toggle(list: string[], v: string, set: (x: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/teacher-knowledge/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          teacherName,
          courseSeries,
          lessonNumber,
          lessonDate: lessonDate || null,
          originalFileName: originalFileName || null,
          sourceType,
          assets,
          timeframes,
          tags: tags
            .split(/[,，、\s]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          rawTranscript,
          adminNotes,
        }),
      });
      const json = (await res.json()) as { lesson?: { id: string }; error?: unknown };
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "保存失败");
      router.push(`/admin/teacher-knowledge/lessons/${json.lesson!.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存失败");
      setBusy(false);
    }
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          录入老师课程
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          粘贴已转写文字。保存后原文永久保留，AI 不得覆盖。
        </Text>
        <Link href="/admin/teacher-knowledge" className="mb-4 inline-block text-body-sm underline">
          ← 老师知识库
        </Link>

        <Card padding="lg" className="space-y-4">
          <Field label="课程标题">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="老师名称">
            <input className={inputCls} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </Field>
          <Field label="课程系列">
            <input className={inputCls} value={courseSeries} onChange={(e) => setCourseSeries(e.target.value)} />
          </Field>
          <Field label="课程编号">
            <input className={inputCls} value={lessonNumber} onChange={(e) => setLessonNumber(e.target.value)} />
          </Field>
          <Field label="课程日期">
            <input type="date" className={inputCls} value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} />
          </Field>
          <Field label="原始文件名称（可空）">
            <input className={inputCls} value={originalFileName} onChange={(e) => setOriginalFileName(e.target.value)} />
          </Field>
          <Field label="来源类型">
            <select className={inputCls} value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="AUDIO_TRANSCRIPT">AUDIO_TRANSCRIPT</option>
              <option value="VIDEO_TRANSCRIPT">VIDEO_TRANSCRIPT</option>
              <option value="MANUAL_NOTE">MANUAL_NOTE</option>
              <option value="IMAGE_TRANSCRIPT">IMAGE_TRANSCRIPT</option>
              <option value="OTHER">OTHER</option>
            </select>
          </Field>
          <Field label="涉及资产（可多选）">
            <div className="flex flex-wrap gap-2">
              {ASSET_OPTS.map((a) => (
                <label key={a} className="flex items-center gap-1 text-body-sm">
                  <input type="checkbox" checked={assets.includes(a)} onChange={() => toggle(assets, a, setAssets)} />
                  {a}
                </label>
              ))}
            </div>
          </Field>
          <Field label="涉及时间周期">
            <div className="flex flex-wrap gap-2">
              {TF_OPTS.map((a) => (
                <label key={a} className="flex items-center gap-1 text-body-sm">
                  <input
                    type="checkbox"
                    checked={timeframes.includes(a)}
                    onChange={() => toggle(timeframes, a, setTimeframes)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </Field>
          <Field label="标签">
            <input
              className={inputCls}
              placeholder="逗号分隔"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </Field>
          <Field label="原始转写文字">
            <textarea
              className={`${inputCls} min-h-[320px] font-mono text-caption`}
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="直接粘贴几千字至几万字转写文字…"
            />
            <Text variant="caption" color="tertiary">
              字数：{rawTranscript.length}
            </Text>
          </Field>
          <Field label="管理员备注">
            <textarea className={`${inputCls} min-h-24`} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </Field>

          <Button type="button" disabled={busy || !title || !rawTranscript.trim()} onClick={save}>
            {busy ? "保存中…" : "保存原文"}
          </Button>
          {msg ? (
            <Text variant="body-sm" className="text-red-600">
              {msg}
            </Text>
          ) : null}
        </Card>
      </Section>
    </main>
  );
}

const inputCls =
  "w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <Text variant="body-sm" weight="semibold">
        {label}
      </Text>
      {children}
    </label>
  );
}
