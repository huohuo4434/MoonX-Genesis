"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

export default function TeacherKnowledgeImportPage() {
  const [format, setFormat] = useState<"json" | "markdown" | "text">("json");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<unknown>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(action: "preview" | "commit") {
    setMsg(null);
    const res = await fetch("/api/admin/teacher-knowledge/import-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, format, content }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || "失败");
      setPreview(json.preview || json);
      return;
    }
    setPreview(json.preview || json);
    setMsg(action === "preview" ? "预览完成" : "已导入为 DRAFT");
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/teacher-knowledge" />
        <Heading as="h1" size="h2">
          导入老师知识
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 mb-4">
          支持粘贴 JSON / Markdown / 普通文字。导入前必须预览。导入后全部 DRAFT。
        </Text>
        <Link href="/admin/teacher-knowledge" className="mb-4 inline-block text-body-sm underline">
          ← 老师知识库
        </Link>

        <Card padding="md" className="space-y-3">
          <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
            <option value="json">粘贴 / 上传 JSON</option>
            <option value="markdown">粘贴 / 上传 Markdown</option>
            <option value="text">粘贴 / 上传普通文字</option>
          </select>
          <label className="block rounded-md border border-dashed border-border/[0.18] p-3 text-body-sm">
            <span className="mb-2 block text-foreground-secondary">选择知识包文件（推荐直接上传 JSON）</span>
            <input
              type="file"
              accept=".json,.md,.markdown,.txt,application/json,text/plain,text/markdown"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const ext = file.name.toLowerCase();
                setFormat(ext.endsWith(".json") ? "json" : ext.endsWith(".md") || ext.endsWith(".markdown") ? "markdown" : "text");
                setContent(await file.text());
                setMsg(`已读取文件：${file.name}`);
                setPreview(null);
              }}
            />
          </label>
          <textarea
            className={`${inputCls} min-h-[280px] font-mono text-caption`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='JSON 示例：{"lesson":{"title":"…","rawTranscript":"…"},"rules":[{"title":"…","conclusion":"…","sourceQuote":"…"}]}'
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => run("preview")} disabled={!content.trim()}>
              预览
            </Button>
            <Button type="button" variant="secondary" onClick={() => run("commit")} disabled={!content.trim()}>
              确认导入（DRAFT）
            </Button>
            <Button asChild variant="secondary">
              <Link href="/api/admin/teacher-knowledge/import-export?kind=full">导出完整备份</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/api/admin/teacher-knowledge/import-export?kind=ai&format=md">导出AI知识包</Link>
            </Button>
          </div>
          {msg ? (
            <Text variant="body-sm" color="secondary">
              {msg}
            </Text>
          ) : null}
          <pre className="max-h-96 overflow-auto text-caption">{preview ? JSON.stringify(preview, null, 2) : ""}</pre>
        </Card>
      </Section>
    </main>
  );
}

const inputCls = "w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm";
