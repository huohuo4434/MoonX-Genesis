import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { listCandidates, updateCandidate, getLesson } from "@/lib/master-intelligence/store";
import { approveCandidateToPublished } from "@/lib/master-intelligence/pipeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const status = req.nextUrl.searchParams.get("reviewStatus") as
    | "DRAFT"
    | "APPROVED"
    | "REJECTED"
    | "PUBLISHED"
    | null;
  const candidates = await listCandidates(status ? { reviewStatus: status } : undefined);
  return NextResponse.json({ candidates }, { headers: { "Cache-Control": "no-store" } });
}

const bodySchema = z.object({
  id: z.string(),
  action: z.enum(["approve", "reject", "publish"]),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const all = await listCandidates();
  const cand = all.find((c) => c.id === parsed.data.id);
  if (!cand) return NextResponse.json({ error: "未找到候选" }, { status: 404 });

  if (parsed.data.action === "reject") {
    await updateCandidate(cand.id, { reviewStatus: "REJECTED" });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "approve" || parsed.data.action === "publish") {
    const ref = await approveCandidateToPublished(cand);
    if (cand.lessonId) {
      const pack = await getLesson(cand.lessonId);
      void pack;
    }
    return NextResponse.json({ ok: true, publishedRef: ref });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
