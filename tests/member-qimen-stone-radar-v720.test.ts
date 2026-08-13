import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("typed research pack preserves period six markets and undated branches", () => {
  const data = read("lib/data/member-qimen-stone-radar-20260814.ts");
  assert.match(data, /start: "2026-08-17";? end: "2026-08-22"|start: "2026-08-17", end: "2026-08-22"/);
  for (const id of ["US_BROAD", "SP500", "SOX", "A_SHARES", "BTC", "HSTECH"]) assert.match(data, new RegExp(`id: "${id}"`));
  assert.equal((data.match(/id: "(?:US_BROAD|SP500|SOX|A_SHARES|BTC|HSTECH)"/g) ?? []).length, 6);
  assert.match(data, /dates: \[\] as never\[\]/);
  assert.doesNotMatch(data, /亥日.*2026-|卯日.*2026-|未日.*2026-/);
});

test("source claims remain unverified and separated from MOOX interpretation", () => {
  const data = read("lib/data/member-qimen-stone-radar-20260814.ts");
  const component = read("components/member/MemberQimenStoneRadar.tsx");
  assert.match(data, /sourcePublishedAt: null/);
  assert.match(data, /verificationStatus: "UNVERIFIED_SOURCE_CLAIM"/);
  assert.match(data, /sourceClaims:/);
  assert.match(data, /mooxInterpretation:/);
  assert.match(data, /consensusEligible: false/);
  assert.match(data, /executionAuthority: "RESEARCH_ONLY"/);
  assert.match(data, /currentSignal: null/);
  assert.doesNotMatch(data, /currentSignal: "(?:GREEN|RED|LONG|SHORT)"/);
  assert.match(component, /SOURCE_CLAIM/);
  assert.match(component, /radar\.stone\.sourceClaims/);
  assert.match(component, /radar\.stone\.mooxInterpretation/);
});

test("research pack has no trading imports or triggers", () => {
  const data = read("lib/data/member-qimen-stone-radar-20260814.ts");
  assert.doesNotMatch(data, /lib\/bitget|trading-signals|place.*Order|submit.*Order|executeReadyDecision/);
  assert.match(data, /不直接触发交易/);
  assert.match(data, /反弹不等于反转/);
});

test("full research data is loaded only after the member locked gate", () => {
  const route = read("app/member/weekly/page.tsx");
  const pack = read("lib/data/member-qimen-stone-radar-20260814.ts");
  assert.match(pack, /import "server-only"/);
  const lockedAt = route.indexOf('if (payload.mode === "locked")');
  const lockedReturnAt = route.indexOf("return <MemberWeeklyLockedPage", lockedAt);
  const dynamicImportAt = route.indexOf('await import("@/lib/data/member-qimen-stone-radar-20260814")');
  const loadAt = route.indexOf("getMemberQimenStoneRadar20260814()", dynamicImportAt);
  assert.doesNotMatch(route, /import \{ getMemberQimenStoneRadar20260814 \} from/);
  assert.ok(lockedAt >= 0 && lockedReturnAt > lockedAt);
  assert.ok(dynamicImportAt > lockedReturnAt && loadAt > dynamicImportAt);
  const page = read("components/member/MemberWeeklyPage.tsx");
  const lockedStart = page.indexOf("export function MemberWeeklyLockedPage");
  const fullStart = page.indexOf("export function MemberWeeklyFullPage");
  assert.ok(lockedStart >= 0 && fullStart > lockedStart);
  assert.doesNotMatch(page.slice(lockedStart, fullStart), /researchRadar|MemberQimenStoneRadar/);
});

test("public methodology exposes roles but not the member research pack", () => {
  const methodology = read("components/methodology/MethodologyPageClient.tsx");
  assert.match(methodology, /六爻负责正式方向/);
  assert.match(methodology, /不直接触发交易/);
  assert.doesNotMatch(methodology, /2026-08-17|JGB|rehypothecation|亥、卯、未/);
});
