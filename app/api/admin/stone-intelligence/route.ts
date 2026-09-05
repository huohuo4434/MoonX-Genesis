import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { stoneBatchSchema } from "@/lib/stone-intelligence/core";
import { listStoneBatches, saveStoneBatch } from "@/lib/stone-intelligence/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return json({ error: "无权限" }, 403);
  const offset = Number(request?.nextUrl?.searchParams.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return json({ error: "页码不正确" }, 400);
  try { return json(await listStoneBatches(offset)); }
  catch { return json({ error: "Stone 私有存储暂不可读，未返回虚假空列表。" }, 503); }
}
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return json({ error: "无权限" }, 403);
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "来源不匹配" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "只接受 JSON 摘要" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 131072) return json({ error: "摘要过长" }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 131072) return json({ error: "摘要过长" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "JSON 格式错误" }, 400); }
  const parsed = stoneBatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "摘要字段不完整或超出限制", issues: parsed.error.issues.map((x) => ({ path: x.path, message: x.message })) }, 400);
  if (Date.parse(parsed.data.observedAt) > Date.now() + 300000) return json({ error: "不能记录未来的观察时间" }, 400);
  try { return json({ ok: true, ...await saveStoneBatch(parsed.data) }); }
  catch { return json({ error: "摘要未确认保存成功，请刷新核对后重试；旧记录未删除。" }, 503); }
}
