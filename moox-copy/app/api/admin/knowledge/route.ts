import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { listConflicts, updateConflict, listGraph, listRuleTree, listMarketWeights } from "@/lib/master-intelligence/store";
import { runTeacherReasoning } from "@/lib/master-intelligence/reasoning";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const view = req.nextUrl.searchParams.get("view") || "conflicts";
  if (view === "graph") {
    const graph = await listGraph();
    return NextResponse.json(graph, { headers: { "Cache-Control": "no-store" } });
  }
  if (view === "rule-tree") {
    return NextResponse.json({ nodes: await listRuleTree() }, { headers: { "Cache-Control": "no-store" } });
  }
  if (view === "market-weights") {
    return NextResponse.json({ weights: await listMarketWeights() }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ conflicts: await listConflicts() }, { headers: { "Cache-Control": "no-store" } });
}

const reasonSchema = z.object({
  query: z.string().min(1),
  assetId: z.string().nullable().optional(),
});

const conflictSchema = z.object({
  id: z.string(),
  action: z.enum(["resolve"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.query) {
    const parsed = reasonSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const result = await runTeacherReasoning(parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }
  const parsed = conflictSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "无效请求" }, { status: 400 });
  const row = await updateConflict(parsed.data.id, {
    status: "RESOLVED",
    resolvedNote: parsed.data.note ?? "管理员已确认",
  });
  return NextResponse.json({ conflict: row }, { headers: { "Cache-Control": "no-store" } });
}
