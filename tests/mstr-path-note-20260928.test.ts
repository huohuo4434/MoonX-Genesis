import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mstrPathNote as note } from "../content/public-notes/mstr-path-20260928";

test("bilingual author scenarios preserve levels, dates and uncertainty", () => {
  assert.equal(note.id, "mstr-path-20260928");
  assert.equal(note.date, "2026-09-28");
  for (const copy of [note.zh, note.en]) {
    const body = JSON.stringify(copy);
    for (const value of ["101.05", "137.41", "81.80", "171.79", "126.79", "2022", "2026", "2027", "12.29", "10.46", "1.83"]) assert.ok(body.includes(value), value);
    assert.equal(copy.sections.length, 5);
    assert.equal(copy.steps.length, 4);
  }
  assert.match(JSON.stringify(note.zh), /不是已经日线死叉|并不是已经日线死叉/);
  assert.match(note.zh.disclaimer, /不触发自动交易/);
  assert.match(note.en.disclaimer, /does not revise locked official forecasts or trigger automated trading/);
  assert.match(JSON.stringify(note.en), /not a confirmed bottom/);
  assert.match(JSON.stringify(note.zh), /不是经过统计检验/);
});

test("exact original PNG bytes and dimensions are preserved", () => {
  const hashes = ["6fc255f99a4408f6bed7c9cf93722374728241b038579b889e914bd517e28cde", "9ba061ee14c43d37e450eb2bb9d4ec8d5f5c0c73510bce2b3c151634d2a0990b"];
  note.images.forEach((image, index) => {
    const data = readFileSync(`public${image.path}`);
    assert.equal(createHash("sha256").update(data).digest("hex"), hashes[index]);
    assert.equal(data.readUInt32BE(16), image.width);
    assert.equal(data.readUInt32BE(20), image.height);
  });
});

test("public server-rendered note has no database, polling or execution dependency", () => {
  const component = readFileSync("components/member/MstrPathNote20260928.tsx", "utf8");
  assert.doesNotMatch(component, /useEffect|setInterval|fetch\(|supabase|lib\/bitget|dangerouslySetInnerHTML/);
  assert.match(component, /unoptimized/);
  assert.match(component, /<details open/);
  assert.match(component, /note\.en : note\.zh/);
  const catalogue = readFileSync("components/member/PublicNotes.tsx", "utf8");
  assert.match(catalogue, /await getRequestLocale/);
  assert.match(catalogue, /<MstrPathNote20260928 en=\{en\}/);
  assert.match(catalogue, /<CryptoRiskNote20260925 \/>/);
});
