import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  listAssetResearchUploads,
  saveAssetResearchUpload,
} from "@/lib/data/asset-research-upload-store";

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

  if (!assetSymbol || !assetName || !method || !period) {
    return NextResponse.json(
      { error: "资产代码、名称、方法和周期不能为空" },
      { status: 400 }
    );
  }

  try {
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
    });
    return NextResponse.json(
      {
        ok: true,
        record,
        message: "材料已进入待整理区，不会自动发布为正式预测",
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
