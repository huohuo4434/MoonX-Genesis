import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MEMBER_VIDEO_CATALOG, MEMBER_VIDEO_EPISODE_COUNT, getMemberVideoRecord } from "../lib/member-videos/catalog";
import { isMemberVideoSlug, memberVideoReleaseObjectPath, validateMemberVideoReleaseFiles } from "../lib/member-videos/core";

const read = (path: string) => readFileSync(path, "utf8");
test("both voice versions are independently allowlisted with reciprocal switching", () => {
  const base = "musk-ecosystem-september-2026";
  const zh = getMemberVideoRecord(base)!;
  const en = getMemberVideoRecord(`${base}-en`)!;
  assert.equal(zh.narrationLanguage, "zh-CN");
  assert.equal(en.narrationLanguage, "en");
  assert.equal(zh.alternateSlug, en.slug);
  assert.equal(en.alternateSlug, zh.slug);
  assert.equal(en.alternateOf, zh.slug);
  assert.equal(MEMBER_VIDEO_EPISODE_COUNT, 4);
  for (const entry of [zh, en]) {
    assert.ok(isMemberVideoSlug(entry.slug));
    assert.deepEqual(entry.subtitleLanguages, ["zh-CN", "en"]);
    assert.ok(read("lib/member-videos/storage.server.ts").includes(`${entry.slug}/manifest.json`));
    assert.equal(memberVideoReleaseObjectPath({ slug: entry.slug as Parameters<typeof memberVideoReleaseObjectPath>[0]["slug"], releaseId: "123e4567-e89b-42d3-a456-426614174000", asset: "video" }), `${entry.slug}/releases/123e4567-e89b-42d3-a456-426614174000/video.mp4`);
  }
  assert.equal(new Set(MEMBER_VIDEO_CATALOG.map(x => x.slug)).size, MEMBER_VIDEO_CATALOG.length);
});

test("each voice release still requires both subtitle tracks before publication", () => {
  assert.equal(validateMemberVideoReleaseFiles([
    { name: "video.mp4", metadata: { size: 6800000 } },
    { name: "subtitles.vtt", metadata: { size: 4000 } },
  ], { requireEnglishSubtitle: true }).error, "ENGLISH_SUBTITLE_INCOMPLETE");
  const page = read("app/member/videos/page.tsx");
  assert.match(page, /default=\{!english\}/);
  assert.match(page, /default=\{english\}/);
  assert.match(page, /const sources = allowed \? getMemberVideoSources/);
});

test("source charts and original script preserve uncertainty and private-data boundaries", () => {
  const script = JSON.parse(read("tools/media/musk-outlook-20260905.json"));
  assert.equal(script.slides.length, 12);
  assert.deepEqual(script.slides[2].chart, { base: [1,1,0,1,0,1], moving: [] });
  assert.deepEqual(script.slides[3].chart, { base: [1,0,1,1,1,0], moving: [1,5] });
  for (const slide of script.slides) {
    assert.equal(slide.zh.length, slide.en.length);
    assert.equal(slide.title.length, 2);
  }
  const text = JSON.stringify(script);
  assert.doesNotMatch(text, /赵志伟|1984|patreon\.com|Stone美股|保证翻倍|386美元大型拉锯战/);
  assert.match(text, /不是两份独立证据/);
  assert.match(text, /九月必定官宣，不是我认可的事实/);
  assert.match(text, /不是目标预测/);
  assert.match(text, /可靠证据证明能稳定预测/);
  assert.match(text, /九月七日美国劳动节，美股休市/);
  assert.match(text, /明年一月二十七日的完整观察期结束/);
});
