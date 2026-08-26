import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { MEMBER_VIDEO_CATALOG } from "../lib/member-videos/catalog";
import {
  isMemberVideoReleaseId,
  memberVideoReleaseObjectPath,
  parseMemberVideoManifest,
  validateMemberVideoReleaseFiles,
} from "../lib/member-videos/core";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("public member-video catalogue exposes title metadata but not the member research summary", () => {
  assert.deepEqual(MEMBER_VIDEO_CATALOG, [
    {
      slug: "nasdaq-100-historic-drop-window-2026",
      title: "纳指100 · 十年周期风险窗口",
      durationLabel: "4分51秒",
      publishedAt: "2026-08-26",
    },
  ]);
  const catalogue = source("lib/member-videos/catalog.ts");
  assert.doesNotMatch(catalogue, /2028|2029|30%|50%|失效条件/);
});

test("member-only copy and storage coordinates stay in server-only modules", () => {
  const memberContent = source("lib/member-videos/member-content.server.ts");
  const storage = source("lib/member-videos/storage.server.ts");
  const core = source("lib/member-videos/core.ts");
  const uploader = source("components/admin/MemberVideoUploadClient.tsx");
  assert.match(memberContent, /^import "server-only";/);
  assert.match(storage, /^import "server-only";/);
  assert.match(storage, /moonx-member-videos/);
  assert.match(core, /MEMBER_VIDEO_FILE_SIZE_LIMIT = 32 \* 1024 \* 1024/);
  assert.match(storage, /fileSizeLimit: MEMBER_VIDEO_FILE_SIZE_LIMIT/);
  assert.match(uploader, /video\.size > MEMBER_VIDEO_FILE_SIZE_LIMIT/);
  assert.match(uploader, /视频不能超过32MB/);
  assert.doesNotMatch(uploader, /100 \* 1024 \* 1024|超过100MB/);
  assert.match(storage, /createSignedUrl/);
  assert.match(storage, /listBuckets/);
  assert.match(storage, /!bucket \|\| bucket\.public/);
  assert.match(storage, /"video\/mp4", "text\/vtt", "application\/json"/);
  assert.match(storage, /updateBucket\(MEMBER_VIDEO_BUCKET/);
  assert.match(storage, /storageAdminError/);
  assert.doesNotMatch(storage, /getPublicUrl|publicUrl/);
});

test("release core rejects path injection, wrong manifests and incomplete bundles", () => {
  const releaseId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(isMemberVideoReleaseId(releaseId), true);
  assert.equal(isMemberVideoReleaseId("../../public"), false);
  assert.throws(() =>
    memberVideoReleaseObjectPath({
      slug: "nasdaq-100-historic-drop-window-2026",
      releaseId: "../../public",
      asset: "video",
    }),
  );
  assert.equal(
    memberVideoReleaseObjectPath({
      slug: "nasdaq-100-historic-drop-window-2026",
      releaseId,
      asset: "subtitle",
    }),
    `nasdaq-100-historic-drop-window-2026/releases/${releaseId}/subtitles.vtt`,
  );
  assert.equal(
    parseMemberVideoManifest(
      {
        schemaVersion: 1,
        slug: "wrong-slug",
        releaseId,
        publishedAt: "2026-08-26T00:00:00.000Z",
      },
      "nasdaq-100-historic-drop-window-2026",
    ),
    null,
  );
  assert.deepEqual(validateMemberVideoReleaseFiles([]), {
    ok: false,
    error: "VIDEO_INCOMPLETE",
  });
  assert.deepEqual(
    validateMemberVideoReleaseFiles([
      { name: "video.mp4", metadata: { size: 29_000_000 } },
      { name: "subtitles.vtt", metadata: { size: 12 } },
    ]),
    { ok: false, error: "SUBTITLE_INCOMPLETE" },
  );
  assert.deepEqual(
    validateMemberVideoReleaseFiles([
      { name: "video.mp4", metadata: { size: 29_000_000 } },
      { name: "subtitles.vtt", metadata: { size: 2_000 } },
    ]),
    { ok: true },
  );
});

test("playback API authenticates member and device before signing a short-lived URL", () => {
  const route = source("app/api/member/videos/[slug]/route.ts");
  const guard = route.indexOf("await requireMemberVideoAccess({ failClosed: true })");
  const signer = route.indexOf("createMemberVideoSignedUrl({");
  assert.ok(guard >= 0 && signer > guard);
  assert.match(route, /const requireMemberVideoAccess = getMemberDevicePageAccess/);
  assert.match(route, /requireMemberVideoAccess\(\{ failClosed: true \}\)/);
  assert.match(route, /LOGIN_REQUIRED[\s\S]*401/);
  assert.match(route, /MEMBERSHIP_REQUIRED|会员权限不足/);
  assert.match(route, /DEVICE_REQUIRED/);
  assert.match(route, /checkMemberApiRateLimit/);
  assert.match(route, /NextResponse\.redirect\(signedUrl, \{ status: 307/);
  assert.match(route, /private, no-store/);
  assert.match(source("lib/member-videos/storage.server.ts"), /15 \* 60/);
  const guardSource = source("lib/auth/member-device-guard.ts");
  assert.match(guardSource, /failClosed\?: boolean/);
  assert.match(guardSource, /input\?\.failClosed[\s\S]*status: "DEVICE_REQUIRED"/);
});

test("admin uploader is admin-only, fixed-path, private and atomically published", () => {
  const route = source("app/api/admin/member-videos/upload-url/route.ts");
  const client = source("components/admin/MemberVideoUploadClient.tsx");
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /ensureMemberVideoBucket/);
  assert.match(route, /randomUUID\(\)/);
  assert.match(route, /createSignedUploadUrl\(objectPath, \{ upsert: false \}\)/);
  const core = source("lib/member-videos/core.ts");
  assert.match(core, /video\.mp4/);
  assert.match(core, /subtitles\.vtt/);
  assert.match(route, /MEMBER_VIDEO_STORAGE\[SLUG\]\.manifest/);
  const publishManifest = route.lastIndexOf("const manifest = {");
  assert.ok(route.indexOf("视频文件未完整上传") < publishManifest);
  assert.ok(route.indexOf("字幕文件未完整上传") < publishManifest);
  assert.doesNotMatch(route, /body\.path|body\.bucket/);
  assert.match(client, /uploadToSignedUrl/);
  assert.match(client, /new Blob\(\[file\], \{ type: expectedType \}\)/);
  assert.match(client, /files\["video\.mp4"\]/);
  assert.match(client, /files\["subtitles\.vtt"\]/);
  assert.match(client, /action: "prepare"/);
  assert.match(client, /action: "publish"/);
  assert.ok(client.indexOf('uploadOne("subtitle"') < client.indexOf('action: "publish"'));
  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
});

test("member page shows a locked cover to visitors and playback only in allowed branch", () => {
  const page = source("app/member/videos/page.tsx");
  assert.match(page, /getMemberDevicePageAccess\(\{ failClosed: true \}\)/);
  assert.match(page, /const allowed = gate\.status === "ALLOWED"/);
  assert.match(page, /allowed \? \(/);
  assert.match(page, /普通访客可查看标题，会员登录后播放完整视频/);
  assert.match(page, /\/api\/member\/videos\/\$\{video\.slug\}/);
  assert.match(page, /asset=subtitle/);
});
