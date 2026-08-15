import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberWealthChainPanel } from "../components/member/MemberWealthChainPanel";
import { projectWealthChainForMember, validateWealthChainArchive } from "../lib/data/member-wealth-chain-core";
import type { MemberWealthChainPack, WealthChainEpisode } from "../types/member-wealth-chain";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const data = read("lib/data/member-wealth-chain-20260815.ts");
const route = read("app/member/founder-cycle/page.tsx");
const component = read("components/member/MemberWealthChainPanel.tsx");

const expectedSources = [
  ["eAizM_rSLqs", "F27997D645CFB2F519095DEA7AD2E84C9B3214CDCD24C100DCD77CDD94550CB0"],
  ["xLgGbGP9oSY", "265B02E66AA61E59F043CE8E0236412091E7EB0F860A50117F054A34C37549D4"],
  ["22DYoN3ID14", "EF328E6131DB322D260A9EFEA1EECE2C1B1D5C04C01BE6F048F2FD1A100194A3"],
  ["zwlM6_UmWwo", "FFD578D6B5AA8610C182C1E0356441414CE301C500E7F4951EFD20ECF4B15FC6"],
  ["a-Qeq2M_6t4", "3C5C1D6EA92109503B3C6B68513792B7DB7E2E46FD9615FBD66571774DDAFA11"],
  ["PZTnPsQU3I0", "1E1AE766F79BADC358180CFE911BA9F17B075FFADC2F2E3B3295A529F4B16791"],
  ["q_Sjoksq8gI", "D06BA52E8C2935A85E5F12613B83C5C2D9BDCF4CF6ECF5C88DF8B2ADC6698977"],
  ["3FYekp7Om8o", "B12B29D1E214C69CAB1F17975D251C39D516499DC5DA2382C50DF22739AB5251"],
] as const;

function episode(index: number): WealthChainEpisode {
  return {
    id: `episode-${index}`,
    sourceVideoId: `VIDEOID${String(index).padStart(4, "0")}`,
    sourceContentSha256: String(index).padStart(64, "A"),
    sourceTranscriptFile: `private-${index}.vtt`,
    sourcePublishedAt: null,
    verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
    topics: ["CAPITAL_CYCLE"],
    assets: ["AVGO"],
    horizon: { zh: "按季度", en: "Quarterly" },
    title: { zh: `研究 ${index}`, en: `Research ${index}` },
    thesis: { zh: "主结论", en: "Thesis" },
    evidenceToWatch: [{ zh: "收入和现金流", en: "Revenue and cash flow" }],
    confirmationSignals: [{ zh: "收入兑现", en: "Revenue confirms" }],
    invalidationSignals: [{ zh: "现金流恶化", en: "Cash flow weakens" }],
    portfolioUse: { zh: "仅供研究", en: "Research only" },
  };
}

function pack(): MemberWealthChainPack {
  return {
    schemaVersion: "2026-08-15.v1",
    ingestedAt: "2026-08-15",
    title: { zh: "财富链：产业、资金与估值联动", en: "Wealth Chain" },
    description: { zh: "易老师综合解读", en: "Yi interpretation" },
    archiveNotice: { zh: "追加不覆盖", en: "Append only" },
    executionAuthority: "RESEARCH_ONLY",
    consensusEligible: false,
    tradingEligible: false,
    episodeCount: 8,
    episodes: Array.from({ length: 8 }, (_, index) => episode(index)),
  };
}

test("all eight supplied transcripts have stable identities and append-only evidence metadata", () => {
  assert.equal((data.match(/verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING"/g) ?? []).length, 8);
  assert.match(data, /episodeCount: 8/);
  assert.match(data, /sourcePublishedAt: null/);
  for (const [videoId, hash] of expectedSources) {
    assert.equal((data.match(new RegExp(`sourceVideoId: "${videoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g")) ?? []).length, 1);
    assert.equal((data.match(new RegExp(hash, "g")) ?? []).length, 1);
  }
  assert.match(data, /getMemberWealthChainArchiveInternal/);
  assert.match(data, /getMemberWealthChainView20260815/);
});

test("member projection strips raw transcript identity while preserving the research report", () => {
  const view = projectWealthChainForMember(pack());
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /sourceVideoId|sourceContentSha256|sourceTranscriptFile|private-\d+\.vtt/);
  assert.match(serialized, /易老师综合解读/);
  assert.equal(view.episodes.length, 8);
  const html = renderToStaticMarkup(React.createElement(MemberWealthChainPanel, { pack: view, locale: "zh" }));
  assert.match(html, /财富链：产业、资金与估值联动/);
  assert.match(html, /继续跟踪的证据/);
  assert.match(html, /确认信号/);
  assert.match(html, /失效条件/);
  assert.match(html, /所有记录均不触发交易/);
  assert.doesNotMatch(html, /Damon|D的财富链|YouTube|Seeking Alpha|private-\d+\.vtt|VIDEOID/);
});

test("archive rejects duplicate videos, duplicate content and any trading authority expansion", () => {
  const duplicateVideo = pack();
  duplicateVideo.episodes[1]!.sourceVideoId = duplicateVideo.episodes[0]!.sourceVideoId;
  assert.throws(() => validateWealthChainArchive(duplicateVideo), /DUPLICATE_WEALTH_CHAIN_VIDEO/);

  const duplicateContent = pack();
  duplicateContent.episodes[1]!.sourceContentSha256 = duplicateContent.episodes[0]!.sourceContentSha256;
  assert.throws(() => validateWealthChainArchive(duplicateContent), /DUPLICATE_WEALTH_CHAIN_CONTENT/);

  const unsafe = pack();
  Object.assign(unsafe, { tradingEligible: true });
  assert.throws(() => validateWealthChainArchive(unsafe), /WEALTH_CHAIN_AUTHORITY_VIOLATION/);
});

test("private wealth archive loads only after login membership and device gates", () => {
  const gate = route.indexOf('if (action === "RENDER_DEVICE_GATE")');
  const founderImport = route.indexOf('import("@/lib/data/member-founder-cycle-20260814")');
  const wealthImport = route.indexOf('import("@/lib/data/member-wealth-chain-20260815")');
  assert.ok(gate >= 0 && founderImport > gate && wealthImport > gate);
  assert.match(route.slice(0, wealthImport), /REDIRECT_LOGIN/);
  assert.match(route.slice(0, wealthImport), /REDIRECT_MEMBERSHIP/);
  assert.match(route, /getMemberWealthChainView20260815/);
});

test("wealth chain is detailed research only and has no API database or order integration", () => {
  const combined = [data, component, read("lib/data/member-wealth-chain-core.ts")].join("\n");
  for (const section of ["evidenceToWatch", "confirmationSignals", "invalidationSignals", "portfolioUse"]) {
    assert.match(data, new RegExp(section));
  }
  assert.match(data, /executionAuthority: "RESEARCH_ONLY"/);
  assert.match(data, /consensusEligible: false/);
  assert.match(data, /tradingEligible: false/);
  assert.doesNotMatch(combined, /process\.env|prisma|\$queryRaw|\$executeRaw|app\/api|bitget|submitOrder|executeReadyDecision/i);
});
