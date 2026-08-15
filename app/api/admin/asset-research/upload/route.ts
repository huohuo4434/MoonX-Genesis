import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import type { MethodEvidenceKind, MethodEvidenceDirection } from "@/lib/research/method-evidence-input-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  ".zip",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  const { listAssetResearchUploads } = await import("@/lib/data/asset-research-upload-store");
  const records = await listAssetResearchUploads();
  return NextResponse.json(
    { records: records.slice(0, 100) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择文件" }, { status: 400 });
  }
  if (!ALLOWED_EXT.has(extOf(file.name))) {
    return NextResponse.json(
      { error: "仅支持 ZIP、图片、PDF、Word、TXT、MD" },
      { status: 400 }
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "文件必须小于50MB" }, { status: 400 });
  }

  const assetSymbol = String(form.get("assetSymbol") ?? "").trim();
  const assetName = String(form.get("assetName") ?? "").trim();
  const assetType = String(form.get("assetType") ?? "").trim();
  const method = String(form.get("method") ?? "").trim();
  const period = String(form.get("period") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const evidenceKind = String(form.get("evidenceKind") ?? "LIUYAO").trim() as MethodEvidenceKind;
  const direction = String(form.get("direction") ?? "NEUTRAL").trim() as MethodEvidenceDirection;
  const movingLinesRaw = String(form.get("movingLines") ?? "").trim();
  const movingLines = movingLinesRaw
    ? movingLinesRaw.split(",").map((value) => Number(value.trim()))
    : [];

  if (!assetSymbol || !assetName || !method || !period) {
    return NextResponse.json(
      { error: "资产代码、名称、方法和周期不能为空" },
      { status: 400 }
    );
  }

  try {
    const { saveAssetResearchUpload } = await import("@/lib/data/asset-research-upload-store");
    const record = await saveAssetResearchUpload({
      assetSymbol,
      assetName,
      assetType: assetType || "CRYPTO",
      method,
      period,
      notes,
      fileName: file.name,
      mime: file.type || null,
      bytes: Buffer.from(await file.arrayBuffer()),
      structuredEvidence: {
        kind: evidenceKind,
        sourceLabel: String(form.get("sourceLabel") ?? "").trim(),
        sourcePublishedAt: String(form.get("sourcePublishedAt") ?? "").trim(),
        applicableStart: String(form.get("applicableStart") ?? "").trim(),
        applicableEnd: String(form.get("applicableEnd") ?? "").trim(),
        direction,
        confirmation: String(form.get("confirmation") ?? "").trim(),
        invalidation: String(form.get("invalidation") ?? "").trim(),
        primaryHexagram: String(form.get("primaryHexagram") ?? "").trim() || undefined,
        mutualHexagram: String(form.get("mutualHexagram") ?? "").trim() || undefined,
        changedHexagram: String(form.get("changedHexagram") ?? "").trim() || undefined,
        movingLines,
        isStaticHexagram: form.get("isStaticHexagram") === "true",
        qimenChart: String(form.get("qimenChart") ?? "").trim() || undefined,
        qimenChartReviewed: form.get("qimenChartReviewed") === "true",
        qimenWindowStart: String(form.get("qimenWindowStart") ?? "").trim() || undefined,
        qimenWindowEnd: String(form.get("qimenWindowEnd") ?? "").trim() || undefined,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        record,
        message:
          record.evidenceReadiness?.state === "FORWARD_LOCKED"
            ? "前瞻证据已锁定，等待结果验证；不会自动发布或触发交易"
            : `材料已保存为WAIT：${record.evidenceReadiness?.hardWaitReasons.join("、") || "证据不完整"}`,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 }
    );
  }
}
