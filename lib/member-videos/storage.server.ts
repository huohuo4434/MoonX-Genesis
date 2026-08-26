import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  memberVideoReleaseObjectPath,
  parseMemberVideoManifest,
  type MemberVideoAsset,
  type MemberVideoManifest,
  type MemberVideoSlug,
} from "@/lib/member-videos/core";

export {
  isMemberVideoReleaseId,
  isMemberVideoSlug,
  memberVideoReleaseObjectPath,
  type MemberVideoAsset,
  type MemberVideoSlug,
} from "@/lib/member-videos/core";

export const MEMBER_VIDEO_BUCKET = "moonx-member-videos";

function storageAdminError(label: string, error: unknown): Error {
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "").trim()
      : "";
  return new Error(detail ? `${label}：${detail}` : label);
}

export const MEMBER_VIDEO_STORAGE = {
  "nasdaq-100-historic-drop-window-2026": {
    manifest: "nasdaq-100-historic-drop-window-2026/manifest.json",
  },
} as const;

async function getPrivateMemberVideoAdmin() {
  const admin = getAdminClient();
  if (!admin) return null;
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) return null;
  const bucket = buckets?.find((item) => item.name === MEMBER_VIDEO_BUCKET);
  if (!bucket || bucket.public) return null;
  return admin;
}

async function loadMemberVideoManifest(slug: MemberVideoSlug): Promise<MemberVideoManifest | null> {
  const admin = await getPrivateMemberVideoAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(MEMBER_VIDEO_BUCKET)
    .download(MEMBER_VIDEO_STORAGE[slug].manifest);
  if (error || !data) return null;
  try {
    return parseMemberVideoManifest(JSON.parse(await data.text()), slug);
  } catch {
    return null;
  }
}

export async function createMemberVideoSignedUrl(input: {
  slug: MemberVideoSlug;
  asset: MemberVideoAsset;
  expiresIn?: number;
}): Promise<string | null> {
  const admin = await getPrivateMemberVideoAdmin();
  if (!admin) return null;
  const manifest = await loadMemberVideoManifest(input.slug);
  if (!manifest) return null;
  const objectPath = memberVideoReleaseObjectPath({
    slug: input.slug,
    releaseId: manifest.releaseId,
    asset: input.asset,
  });
  const { data, error } = await admin.storage
    .from(MEMBER_VIDEO_BUCKET)
    .createSignedUrl(objectPath, input.expiresIn ?? 15 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function ensureMemberVideoBucket() {
  const admin = getAdminClient();
  if (!admin) throw new Error("会员视频存储尚未配置");
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw storageAdminError("无法检查会员视频存储", listError);
  const current = buckets?.find((bucket) => bucket.name === MEMBER_VIDEO_BUCKET);
  if (current?.public) throw new Error("会员视频存储必须保持私有");
  if (!current) {
    const { error } = await admin.storage.createBucket(MEMBER_VIDEO_BUCKET, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024,
      allowedMimeTypes: ["video/mp4", "text/vtt", "application/json"],
    });
    if (error) throw storageAdminError("无法创建会员视频私有存储", error);
  } else {
    const { error } = await admin.storage.updateBucket(MEMBER_VIDEO_BUCKET, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024,
      allowedMimeTypes: ["video/mp4", "text/vtt", "application/json"],
    });
    if (error) throw storageAdminError("无法校准会员视频私有存储配置", error);
  }
  return admin;
}
