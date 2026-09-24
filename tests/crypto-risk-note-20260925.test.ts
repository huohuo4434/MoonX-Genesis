import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cryptoRiskNote as note } from "../content/public-notes/crypto-risk-20260925";

test("dated research preserves signal uncertainty and disconfirming evidence", () => {
  const body = note.sections.flatMap(section => section.paragraphs).join(" ");
  assert.equal(note.date, "2026-09-25");
  assert.equal(note.id, "btc-eth-risk-20260925");
  for (const text of ["不是日线死叉", "4 月 29 日", "仍是快线高于慢线", "手绘的情景示意", "并不是没有任何支撑", "尚未产生结果", "不是自动交易指令", "不能把九月局部高点事后改称年内最高点", "9 月 24 日一行尚有大量未报项", "流入放缓不等于已经净流出"]) assert.ok(body.includes(text), text);
  for (const section of note.sections) for (const key of section.sources) assert.match(note.sources[key].url, /^https:\/\//);
  assert.equal(Object.keys(note.sources).length, 8);
});

test("two original PNGs retain their exact bytes and full dimensions", () => {
  const hashes = ["a7d46941b370e3c8295660440294ae8dc08c17601fea72c46b40a29855da6c02", "d0d2de73434b49de5b5660dcdff8c82f5b50b7590478f37f7847166566674070"];
  assert.equal(note.images.length, 2);
  note.images.forEach((image, index) => {
    const png = readFileSync(`public${image.path}`);
    assert.equal(createHash("sha256").update(png).digest("hex"), hashes[index]);
    assert.equal(png.readUInt32BE(16), image.width);
    assert.equal(png.readUInt32BE(20), image.height);
    assert.ok(image.caption.includes("永续合约"));
  });
});

test("static public note adds no auth, database, polling or trading dependency", () => {
  const component = readFileSync("components/member/CryptoRiskNote20260925.tsx", "utf8");
  assert.doesNotMatch(component, /useEffect|setInterval|fetch\(|supabase|lib\/bitget|member-notes\/store|dangerouslySetInnerHTML/);
  assert.match(component, /unoptimized/);
  assert.match(component, /<details[^>]*open>/);
  assert.match(readFileSync("components/member/PublicNotes.tsx", "utf8"), /<CryptoRiskNote20260925 \/>/);
});
