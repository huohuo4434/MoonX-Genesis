import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/payments/PricingPageContent.tsx"),
  "utf8",
);

test("pricing introduces every current member research module", () => {
  for (const phrase of [
    "年度路线与关键月",
    "跨周期行情预测",
    "逐周与逐日板块共振",
    "完整卦象与模拟走势",
    "多方观点涨跌矩阵",
    "策略中心与AI交易记录",
  ]) {
    assert.match(source, new RegExp(phrase), phrase);
  }
});

test("pricing links the new modules to their real member routes", () => {
  for (const route of [
    "/member/annual-outlook",
    "/member/daily",
    "/member/sector-resonance",
    "/member/stock-picks",
    "/member/alpha-feed",
    "/member/strategy",
  ]) {
    assert.match(source, new RegExp(route.replaceAll("/", "\\/")), route);
  }
});

test("pricing labels AI trading as a trial instead of promising results", () => {
  assert.match(source, /当前仍为试运行/);
  assert.match(source, /currently in trial operation/i);
  assert.doesNotMatch(source, /保证收益|稳赚|guaranteed returns/i);
});
