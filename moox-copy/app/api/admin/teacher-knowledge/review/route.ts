import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { setKnowledgeStatus } from "@/lib/teacher-knowledge/store";

export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["rule", "case", "concept", "quote", "method"]),
  id: z.string().min(1),
  status: z.enum(["DRAFT", "APPROVED", "REJECTED", "ARCHIVED", "UNCERTAIN"]),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await setKnowledgeStatus(parsed.data.kind, parsed.data.id, parsed.data.status);
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
  );
}
