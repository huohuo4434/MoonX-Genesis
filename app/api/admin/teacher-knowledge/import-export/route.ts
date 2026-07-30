import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  commitImport,
  exportAiPackJson,
  exportAiPackMarkdown,
  exportFullBackup,
  previewImport,
} from "@/lib/teacher-knowledge/import-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const kind = req.nextUrl.searchParams.get("kind") || "full";
  const format = req.nextUrl.searchParams.get("format") || "json";
  const day = new Date().toISOString().slice(0, 10);

  if (kind === "ai" && format === "md") {
    const md = await exportAiPackMarkdown();
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="moox-teacher-knowledge-ai-${day}.md"`,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  if (kind === "ai") {
    const json = await exportAiPackJson();
    return NextResponse.json(json, {
      headers: {
        "Content-Disposition": `attachment; filename="moox-teacher-knowledge-ai-${day}.json"`,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  const full = await exportFullBackup();
  return NextResponse.json(full, {
    headers: {
      "Content-Disposition": `attachment; filename="moox-teacher-knowledge-full-${day}.json"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

const postSchema = z.object({
  action: z.enum(["preview", "commit"]),
  format: z.enum(["json", "markdown", "text"]),
  content: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const preview = previewImport(parsed.data.content, parsed.data.format);
  if (parsed.data.action === "preview") {
    return NextResponse.json(preview, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
  }
  if (!preview.ok) {
    return NextResponse.json({ error: "预览未通过", preview }, { status: 400 });
  }
  const result = await commitImport(preview.payload);
  return NextResponse.json(
    { ok: true, result, preview },
    { headers: { "X-Robots-Tag": "noindex, nofollow" } }
  );
}
