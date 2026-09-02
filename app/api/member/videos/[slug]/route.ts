import { NextRequest, NextResponse } from "next/server";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { checkMemberApiRateLimit } from "@/lib/auth/member-api-rate-limit";
import {
  createMemberVideoSignedUrl,
  isMemberVideoSlug,
  type MemberVideoAsset,
} from "@/lib/member-videos/storage.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const requireMemberVideoAccess = getMemberDevicePageAccess;

async function handle(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const gate = await requireMemberVideoAccess({ failClosed: true });
  if (gate.status !== "ALLOWED" || !gate.access.userId) {
    const message =
      gate.status === "LOGIN_REQUIRED"
        ? "请先登录"
        : gate.status === "DEVICE_REQUIRED"
          ? "会员设备使用权无效"
          : "会员权限不足";
    return NextResponse.json(
      { error: message },
      { status: gate.status === "LOGIN_REQUIRED" ? 401 : 403, headers: PRIVATE_HEADERS },
    );
  }

  const rate = await checkMemberApiRateLimit({ scope: "member-video-playback", limit: 180 });
  if (!rate.ok) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429, headers: PRIVATE_HEADERS });
  }

  const { slug } = await context.params;
  if (!isMemberVideoSlug(slug)) {
    return NextResponse.json({ error: "视频不存在" }, { status: 404, headers: PRIVATE_HEADERS });
  }
  const requestedAsset = request.nextUrl.searchParams.get("asset") ?? "video";
  if (requestedAsset !== "video" && requestedAsset !== "subtitle" && requestedAsset !== "subtitleEn") {
    return NextResponse.json({ error: "资源不存在" }, { status: 404, headers: PRIVATE_HEADERS });
  }
  const signedUrl = await createMemberVideoSignedUrl({
    slug,
    asset: requestedAsset as MemberVideoAsset,
  });
  if (!signedUrl) {
    return NextResponse.json(
      { error: "视频暂时不可用" },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
  if (requestedAsset !== "video") {
    const subtitle = await fetch(signedUrl, { cache: "no-store" });
    if (!subtitle.ok) {
      return NextResponse.json(
        { error: "字幕暂时不可用" },
        { status: 503, headers: PRIVATE_HEADERS },
      );
    }
    return new NextResponse(await subtitle.arrayBuffer(), {
      status: 200,
      headers: { ...PRIVATE_HEADERS, "Content-Type": "text/vtt; charset=utf-8" },
    });
  }
  return NextResponse.redirect(signedUrl, { status: 307, headers: PRIVATE_HEADERS });
}

export const GET = handle;
export const HEAD = handle;
