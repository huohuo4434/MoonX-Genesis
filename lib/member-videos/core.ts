export const MEMBER_VIDEO_SLUGS = ["nasdaq-100-historic-drop-window-2026"] as const;
export const MEMBER_VIDEO_FILE_SIZE_LIMIT = 32 * 1024 * 1024;

export type MemberVideoSlug = (typeof MEMBER_VIDEO_SLUGS)[number];
export type MemberVideoAsset = "video" | "subtitle";

export type MemberVideoManifest = {
  schemaVersion: 1;
  slug: MemberVideoSlug;
  releaseId: string;
  publishedAt: string;
};

export type MemberVideoReleaseFile = {
  name: string;
  metadata?: { size?: number | string | null } | null;
};

const RELEASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMemberVideoSlug(value: string): value is MemberVideoSlug {
  return (MEMBER_VIDEO_SLUGS as readonly string[]).includes(value);
}

export function isMemberVideoReleaseId(value: string): boolean {
  return RELEASE_ID_PATTERN.test(value);
}

export function memberVideoReleaseObjectPath(input: {
  slug: MemberVideoSlug;
  releaseId: string;
  asset: MemberVideoAsset;
}): string {
  if (!isMemberVideoReleaseId(input.releaseId)) throw new Error("无效的视频版本");
  const name = input.asset === "video" ? "video.mp4" : "subtitles.vtt";
  return `${input.slug}/releases/${input.releaseId}/${name}`;
}

export function parseMemberVideoManifest(
  value: unknown,
  expectedSlug: MemberVideoSlug,
): MemberVideoManifest | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<MemberVideoManifest>;
  if (
    parsed.schemaVersion !== 1 ||
    parsed.slug !== expectedSlug ||
    typeof parsed.releaseId !== "string" ||
    !isMemberVideoReleaseId(parsed.releaseId) ||
    typeof parsed.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.publishedAt))
  ) {
    return null;
  }
  return parsed as MemberVideoManifest;
}

export function validateMemberVideoReleaseFiles(files: readonly MemberVideoReleaseFile[]): {
  ok: boolean;
  error?: "VIDEO_INCOMPLETE" | "SUBTITLE_INCOMPLETE";
} {
  const video = files.find((file) => file.name === "video.mp4");
  const subtitle = files.find((file) => file.name === "subtitles.vtt");
  if (Number(video?.metadata?.size ?? 0) < 1024 * 1024) {
    return { ok: false, error: "VIDEO_INCOMPLETE" };
  }
  if (Number(subtitle?.metadata?.size ?? 0) < 32) {
    return { ok: false, error: "SUBTITLE_INCOMPLETE" };
  }
  return { ok: true };
}
