import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/membership";
import {
  readCollection,
  writeCollection,
  type PredictionRecord,
  type ResearchArticleRecord,
} from "@/lib/data/moonx-store";

const bodySchema = z.object({
  kind: z.enum(["today", "tomorrow", "research"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  summary: z.string().max(500).optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = `${body.kind}-${Date.now()}`;

  if (body.kind === "research") {
    const articles = await readCollection<ResearchArticleRecord[]>("research_articles", []);
    articles.unshift({
      id,
      title: body.title,
      summary: body.summary ?? body.body.slice(0, 120),
      body: body.body,
      status: body.status,
      publishedAt: body.status === "published" ? now : null,
      updatedAt: now,
    });
    await writeCollection("research_articles", articles.slice(0, 200));
    return NextResponse.json({ ok: true, id });
  }

  const predictions = await readCollection<PredictionRecord[]>("predictions", []);
  const next = predictions.filter((p) => !(p.type === body.kind && p.status === "published"));
  next.unshift({
    id,
    type: body.kind,
    title: body.title,
    body: body.body,
    status: body.status,
    publishedAt: body.status === "published" ? now : null,
    updatedAt: now,
  });
  await writeCollection("predictions", next.slice(0, 200));
  return NextResponse.json({ ok: true, id });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["publish", "withdraw", "save_draft"]),
});

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const predictions = await readCollection<PredictionRecord[]>("predictions", []);
  const idx = predictions.findIndex((p) => p.id === body.id);
  if (idx < 0) return NextResponse.json({ error: "内容不存在" }, { status: 404 });

  const current = predictions[idx]!;
  const status =
    body.action === "publish" ? "published" : body.action === "withdraw" || body.action === "save_draft" ? "draft" : current.status;

  predictions[idx] = {
    ...current,
    status,
    publishedAt: status === "published" ? now : null,
    updatedAt: now,
  };
  await writeCollection("predictions", predictions);
  return NextResponse.json({ ok: true });
}
