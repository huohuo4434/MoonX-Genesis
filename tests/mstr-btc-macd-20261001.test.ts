import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { macdView, macdSketches } from "../content/public-notes/mstr-btc-macd-20261001";

test("MACD view separates screenshot facts, author interpretation and unknown duration", () => {
  assert.equal(macdView.status, "RESEARCH_ONLY");
  assert.equal(macdView.evidence.screenshotTimestamp, null);
  assert.equal(macdView.evidence.btcIndependentRecalculation, false);
  assert.ok(macdView.evidence.mstrWeekly.dif < 0 && macdView.evidence.mstrWeekly.dea < 0);
  assert.ok(macdView.evidence.mstrDaily.dif < macdView.evidence.mstrDaily.dea);
  assert.equal(macdView.zh.sections.length, macdView.en.sections.length);
  assert.match(macdView.zh.sections[3].paragraphs.join(""), /没有给出.*回调周数/);
  assert.match(macdView.en.sections[3].paragraphs.join(""), /not a universal property/);
  assert.match(macdView.zh.summary, /至少一个月/);
  assert.ok(macdView.sources.every(s => s.url.startsWith("https://")));
});
test("all static media exist and scenario candles have valid schematic geometry only", () => {
  const originalHashes = ["9773b7c271a4b93a2ecf3b6719aeb2f805d07687e143617c154dccfbaef05f28", "dae1f52e653808ffff5d38766a7fd510a078579e906b9fe452cad4db1ab1ef97"];
  macdView.originals.forEach((image, index) => {
    const png = readFileSync(`public/images/public-notes/20261001/${image.file}`);
    assert.equal(createHash("sha256").update(png).digest("hex"), originalHashes[index]);
    assert.equal(png.readUInt32BE(16), image.width);
    assert.equal(png.readUInt32BE(20), image.height);
  });
  for (const [asset, bars] of Object.entries(macdSketches)) {
    assert.equal(bars.length, 4);
    for (const [o, h, l, c] of bars) assert.ok(h >= Math.max(o, c) && l <= Math.min(o, c));
    for (const locale of ["zh", "en"]) {
      const svg = readFileSync(`public/images/public-notes/20261001/${asset}-${locale}.svg`, "utf8");
      assert.equal((svg.match(/data-kind="synthetic"/g) || []).length, 4);
      assert.doesNotMatch(svg, /data-kind="observed"|<script|<foreignObject|NaN|Infinity/);
      assert.match(svg, /SCHEMATIC|模拟示意/);
      assert.match(svg, /NOT price or percentage return|不表示价格或涨跌百分比/);
    }
  }
  for (const locale of ["zh", "en"]) assert.match(readFileSync(`public/images/public-notes/20261001/structure-${locale}.svg`, "utf8"), /SCHEMATIC|模拟示意/);
});
test("views branding and publication preserve history and do not add execution or dynamic data", () => {
  const ui = readFileSync("components/member/MstrBtcMacd20261001.tsx", "utf8");
  assert.doesNotMatch(ui, /useEffect|fetch\(|setInterval|supabase|bitget|dangerouslySetInnerHTML/);
  const archive = readFileSync("components/member/PublicNotes.tsx", "utf8");
  for (const name of ["MstrBtcMacd20261001", "TwoWeekScenarios20260929", "MstrPathNote20260928", "CryptoRiskNote20260925"]) assert.ok(archive.includes(`<${name}`));
  const nav = readFileSync("config/member-channel-navigation.ts", "utf8");
  assert.doesNotMatch(nav, /labelZh: "随笔"/);
  assert.match(nav, /labelZh: "易老师观点"/);
  assert.match(readFileSync("app/member/notes/page.tsx", "utf8"), /getMemberDevicePageAccess\(\{ failClosed: true \}\)/);
});
