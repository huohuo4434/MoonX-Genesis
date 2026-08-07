import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const forecast = fs.readFileSync("lib/data/conviction/asteroid-forecasts.ts", "utf8");
const detail = fs.readFileSync("components/conviction/ConvictionDetailClient.tsx", "utf8");
const feature = fs.readFileSync("components/conviction/AsteroidWatchlistFeature.tsx", "utf8");

test("ASTEROID September target ladder is complete and ordered", () => {
  for (const target of ["4000万美元", "5000万美元", "7000万美元", "8000万美元"]) {
    assert.match(forecast, new RegExp(target));
  }
  assert.ok(forecast.indexOf("4000万美元") < forecast.indexOf("5000万美元"));
  assert.ok(forecast.indexOf("5000万美元") < forecast.indexOf("7000万美元"));
  assert.ok(forecast.indexOf("7000万美元") < forecast.indexOf("8000万美元"));
});

test("target ladder preserves the two-framework interpretations", () => {
  assert.match(forecast, /水火既济/);
  assert.match(forecast, /风天小畜/);
  assert.match(forecast, /地火明夷/);
  assert.match(forecast, /水天需/);
  assert.match(forecast, /雷泽归妹/);
  assert.match(forecast, /雷风恒/);
  assert.match(forecast, /泽地萃/);
  assert.match(forecast, /天雷无妄/);
  assert.match(forecast, /structureView/);
  assert.match(forecast, /timelineView/);
});

test("member detail renders qualitative scenarios without pretending they are statistical probabilities", () => {
  assert.match(detail, /9月底目标市值压力测试/);
  assert.match(detail, /两套六爻框架交叉/);
  assert.match(detail, /不是统计概率/);
  assert.match(detail, /激活条件/);
  assert.match(detail, /风险/);
});

test("BTC nonfarm hexagram is environment context only", () => {
  assert.match(forecast, /市场环境旁证｜8月7日非农事件/);
  assert.match(forecast, /火水未济/);
  assert.match(forecast, /山水蒙/);
  assert.match(forecast, /不直接决定太空狗目标市值/);
});

test("public feature advertises the new ladder without external source attribution", () => {
  assert.match(feature, /9月底四档目标市值压力测试/);
  assert.match(feature, /4000万基准/);
  assert.match(feature, /5000万正常强势/);
  assert.match(feature, /7000万趋势强势/);
  assert.match(feature, /8000万极端FOMO/);
  assert.doesNotMatch(feature, /@btckik|吴昌烨|老师账号|来源账号/);
});
