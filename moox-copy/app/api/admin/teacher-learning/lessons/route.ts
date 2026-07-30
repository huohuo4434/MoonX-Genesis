import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getKnowledgeGrowthStats, listLessons } from "@/lib/teacher-learning-center/store";
import { uploadTeacherLesson } from "@/lib/teacher-learning-center/pipeline";
import { publicPlaybackUrl } from "@/lib/teacher-learning-center/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const [lessons, stats] = await Promise.all([listLessons(), getKnowledgeGrowthStats()]);
  return NextResponse.json(
    {
      lessons: lessons.map((l) => ({
        ...l,
        playbackUrl: publicPlaybackUrl(l.audioUrl),
      })),
      stats,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "请使用 multipart 上传" }, { status: 400 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    const title = String(form.get("title") || "").trim();
    const bytes = Buffer.from(await file.arrayBuffer());
    const lesson = await uploadTeacherLesson({
      fileName: file.name,
      mime: file.type || null,
      bytes,
      title: title || undefined,
    });
    return NextResponse.json(
      {
        lesson: {
          ...lesson,
          playbackUrl: publicPlaybackUrl(lesson.audioUrl),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上传失败" },
      { status: 400 }
    );
  }
}
