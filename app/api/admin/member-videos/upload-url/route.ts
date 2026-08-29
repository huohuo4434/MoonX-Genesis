import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  ensureMemberVideoBucket,
  isMemberVideoReleaseId,
  isMemberVideoSlug,
  MEMBER_VIDEO_BUCKET,
  MEMBER_VIDEO_STORAGE,
  memberVideoReleaseObjectPath,
  type MemberVideoAsset,
} from "@/lib/member-videos/storage.server";
import { validateMemberVideoReleaseFiles } from "@/lib/member-videos/core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStore(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

async function activeRelease(
  admin: Awaited<ReturnType<typeof ensureMemberVideoBucket>>,
  slug: keyof typeof MEMBER_VIDEO_STORAGE,
) {
  const { data, error } = await admin.storage
    .from(MEMBER_VIDEO_BUCKET)
    .download(MEMBER_VIDEO_STORAGE[slug].manifest);
  if (error || !data) return null;
  try {
    const manifest = JSON.parse(await data.text()) as { releaseId?: string; publishedAt?: string };
    if (!manifest.releaseId || !isMemberVideoReleaseId(manifest.releaseId)) return null;
    return { releaseId: manifest.releaseId, publishedAt: manifest.publishedAt ?? null };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return noStore({ error: "无权限" }, 403);
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!isMemberVideoSlug(slug)) return noStore({ error: "不支持的会员视频" }, 400);
  try {
    const admin = await ensureMemberVideoBucket();
    const active = await activeRelease(admin, slug);
    if (!active) return noStore({ ok: true, bucketPublic: false, active: null, files: {} });
    const folder = `${slug}/releases/${active.releaseId}`;
    const { data, error } = await admin.storage.from(MEMBER_VIDEO_BUCKET).list(folder, {
      limit: 10,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error("无法读取会员视频状态");
    const files = Object.fromEntries(
      (data ?? []).map((file) => [
        file.name,
        { size: Number(file.metadata?.size ?? 0), updatedAt: file.updated_at ?? null },
      ]),
    );
    return noStore({ ok: true, bucketPublic: false, active, files });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "状态读取失败" }, 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return noStore({ error: "无权限" }, 403);
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    releaseId?: string;
    slug?: string;
  } | null;
  if (!body?.slug || !isMemberVideoSlug(body.slug) || (body.action !== "prepare" && body.action !== "publish")) {
    return noStore({ error: "不支持的会员视频操作" }, 400);
  }
  const slug = body.slug;

  try {
    const admin = await ensureMemberVideoBucket();
    if (body.action === "prepare") {
      const releaseId = randomUUID();
      const assets = {} as Record<
        MemberVideoAsset,
        { bucket: string; path: string; token: string }
      >;
      for (const asset of ["video", "subtitle"] as const) {
        const objectPath = memberVideoReleaseObjectPath({ slug, releaseId, asset });
        const { data, error } = await admin.storage
          .from(MEMBER_VIDEO_BUCKET)
          .createSignedUploadUrl(objectPath, { upsert: false });
        if (error || !data?.token) throw new Error("无法创建安全上传凭证");
        assets[asset] = { bucket: MEMBER_VIDEO_BUCKET, path: objectPath, token: data.token };
      }
      return noStore({ ok: true, releaseId, assets });
    }

    const releaseId = String(body.releaseId ?? "");
    if (!isMemberVideoReleaseId(releaseId)) return noStore({ error: "无效的视频版本" }, 400);
    const folder = `${slug}/releases/${releaseId}`;
    const { data: releaseFiles, error: listError } = await admin.storage
      .from(MEMBER_VIDEO_BUCKET)
      .list(folder, { limit: 10 });
    if (listError) throw new Error("无法复核上传文件");
    const validation = validateMemberVideoReleaseFiles(releaseFiles ?? []);
    if (validation.error === "VIDEO_INCOMPLETE") {
      return noStore({ error: "视频文件未完整上传" }, 409);
    }
    if (validation.error === "SUBTITLE_INCOMPLETE") {
      return noStore({ error: "字幕文件未完整上传" }, 409);
    }

    const manifest = {
      schemaVersion: 1,
      slug,
      releaseId,
      publishedAt: new Date().toISOString(),
    };
    const { error: publishError } = await admin.storage
      .from(MEMBER_VIDEO_BUCKET)
      .upload(MEMBER_VIDEO_STORAGE[slug].manifest, JSON.stringify(manifest), {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });
    if (publishError) throw new Error("无法发布会员视频版本");
    return noStore({ ok: true, active: manifest });
  } catch (error) {
    return noStore({ error: error instanceof Error ? error.message : "会员视频操作失败" }, 500);
  }
}
