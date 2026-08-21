import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ARTIFACTS = {
  windows: { file: "MOOX-Bitget-Windows.zip", type: "application/zip", disposition: "attachment" },
  pdf: { file: "MOOX会员AI交易接入教程.pdf", type: "application/pdf", disposition: "attachment" },
  video: { file: "MOOX会员Bitget接入教程.mp4", type: "video/mp4", disposition: "inline" },
  poster: { file: "moox-bitget-tutorial-cover.png", type: "image/png", disposition: "inline" },
  agent: { file: "moox-bitget-local-agent.mjs", type: "text/javascript; charset=utf-8", disposition: "attachment" },
  config: { file: "moox-bitget-local-agent.env.example", type: "text/plain; charset=utf-8", disposition: "attachment" },
  guide: { file: "moox-bitget-local-agent-guide.md", type: "text/markdown; charset=utf-8", disposition: "attachment" },
} as const;

type ArtifactKey = keyof typeof ARTIFACTS;

function contentDisposition(mode: string, filename: string): string {
  return `${mode}; filename="moox-member-artifact"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ artifact: string }> }) {
  const gate = await getMemberDevicePageAccess();
  if (gate.status !== "ALLOWED" || !gate.access.userId) {
    return NextResponse.json(
      { error: gate.status === "LOGIN_REQUIRED" ? "请先登录" : gate.status === "DEVICE_REQUIRED" ? "会员设备使用权无效" : "会员权限不足" },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const rate = await checkMemberApiRateLimit({ scope: "member-trading-artifact", limit: 120 });
  if (!rate.ok) return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  const { artifact } = await context.params;
  const descriptor = ARTIFACTS[artifact as ArtifactKey];
  if (!descriptor) return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  const body = await readFile(join(process.cwd(), "private-assets", "member-trading", descriptor.file));
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": contentDisposition(descriptor.disposition, descriptor.file),
    "Content-Type": descriptor.type,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  };
  const range = request.headers.get("range");
  if (descriptor.type === "video/mp4" && range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
    if (!match) return new NextResponse(null, { status: 416, headers: { ...commonHeaders, "Content-Range": `bytes */${body.length}` } });
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= body.length) {
      return new NextResponse(null, { status: 416, headers: { ...commonHeaders, "Content-Range": `bytes */${body.length}` } });
    }
    const chunk = body.subarray(start, end + 1);
    return new NextResponse(chunk, { status: 206, headers: { ...commonHeaders, "Content-Length": String(chunk.length), "Content-Range": `bytes ${start}-${end}/${body.length}` } });
  }
  return new NextResponse(body, { headers: { ...commonHeaders, "Content-Length": String(body.length) } });
}
