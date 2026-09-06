import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SOURCE_REVIEW_20260906 as audit } from "../lib/data/internal/source-review-20260906";
import { memberSeptemberOutlook as view, memberSectorOutlook as sector } from "../lib/presentation/member-september-outlook";
import { MEMBER_SEPTEMBER_ROTATION_REPORT_20260826 as locked } from "../lib/data/member-september-rotation-report-20260826";

test("batch has exact coverage and deduplicated source families without manufactured performance", () => {
  assert.deepEqual(audit.coverage, { materialGroups: 7, textsRead: 7, imagesRead: 21 });
  assert.equal(audit.files.length, 28);
  assert.equal(audit.files.filter((f) => f.name.endsWith(".png")).length, 21);
  assert.ok(audit.files.every((f) => /^[0-9A-F]{64}$/.test(f.sha256)));
  assert.equal(new Set(audit.files.map((f) => f.name)).size, 28);
  assert.equal(new Set(audit.sources.map((s) => s.family)).size, 5);
  assert.equal(audit.sourcePublishedAt, null);
  assert.equal(audit.policy.retrospectiveScoreEligible, false);
  assert.equal(audit.policy.automaticWeightDelta, 0);
  assert.equal(audit.policy.mayTriggerTrade, false);
  assert.equal(audit.policy.mayReverseLockedDirection, false);
  assert.equal(audit.policy.derivativeReportsAddVotes, false);
  assert.equal(audit.repositoryPayload, "PUBLIC_SAFE_REVIEW_METADATA");
  assert.ok(audit.files.every((f) => /^evidence-\d+\.(txt|md|png)$/.test(f.name)));
  assert.doesNotMatch(JSON.stringify(audit), /C:\\Users|狼叔黄金0905|Stone研究复核|Alpha 姐/);
});

test("forward editorial revision leaves locked directions and score samples unchanged", () => {
  assert.equal(view.editorialVersion, "20260906-E1");
  assert.equal(view.version, locked.version);
  assert.equal(audit.priorPresentationCommit, "da9024b");
  assert.deepEqual(view.assets.map((a) => [a.symbol, a.directionZh]), locked.assets.map((a) => [a.symbol, a.directionZh]));
  assert.deepEqual(view.confidenceItems.map((a) => [a.id, a.index]), locked.confidenceCalibration.items.map((a) => [a.id, a.index]));
  assert.match(view.confidenceItems.find((a) => a.id === "GOLD-SEPTEMBER-PATH")!.reasonZh, /分歧/);
  assert.match(view.confidenceItems.find((a) => a.id === "GOLD-SEPTEMBER-PATH")!.reasonEn, /disputed/);
});

test("member guidance separates instruments, disputed turns and calendar events", () => {
  assert.ok(sector.rows.some((r) => r.asset === "黄金"));
  assert.ok(sector.rows.some((r) => r.asset === "白银"));
  assert.ok(sector.rows.some((r) => r.asset === "特斯拉 TSLA"));
  assert.match(sector.rows[0].rhythm, /9月8日复市/);
  assert.match(view.eventNoteZh, /9月11日20:30.*9月15—16日/);
  assert.match(view.eventNoteEn, /08:30 ET.*Sep 15-16 ET/);
  assert.doesNotMatch(JSON.stringify({ view, sector }), /狼叔|Stone|Alpha姐|虎哥|C:\\Users|sha256/);
  assert.match(audit.corrections.join(" "), /SOXX与SOXL/);
  assert.match(audit.sources.find((s) => s.id === "TIGER")!.finding, /74201—74937/);
});

test("private source module is server-only behind the admin gate", () => {
  const source = readFileSync("lib/data/internal/source-review-20260906.ts", "utf8");
  assert.match(source, /import "server-only"/);
  const layout = readFileSync("app/admin/layout.tsx", "utf8");
  assert.ok(layout.indexOf('await requireAdminOrRedirect("/admin")') < layout.indexOf("return children"));
  const page = readFileSync("app/admin/external-viewpoints/page.tsx", "utf8");
  assert.match(page, /data-source-review="20260906"/);
  for (const file of ["lib/presentation/member-september-outlook.ts", "components/member/MemberSeptemberRotationReport.tsx", "app/member/sector-resonance/page.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /source-review-20260906|submitOrder|createOrder/);
  }
});
