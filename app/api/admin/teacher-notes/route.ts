import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { listTeacherNotes } from "@/lib/teacher-voice-learning/store";
import { createNoteFromUpload, processTeacherNote } from "@/lib/teacher-voice-learning/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const notes = await listTeacherNotes();
  return NextResponse.json({ notes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少音频文件" }, { status: 400 });
    }
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const { id } = await createNoteFromUpload({
        fileName: file.name,
        mime: file.type || null,
        bytes,
      });
      // kick async-ish process (await for serverless reliability)
      const result = await processTeacherNote(id);
      return NextResponse.json(
        { id, ...result },
        { status: 201, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "上传失败" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "请使用 multipart 上传" }, { status: 400 });
}
