import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildMemberKeyDateRadar } from "../lib/data/member-key-date-radar";
import { buildSectorResonanceBoard } from "../lib/data/conviction/sector-resonance-board";
import { buildSectorKeyDateWindows } from "../lib/data/conviction/sector-key-date-overview";
import { listStaticFocusForecasts } from "../lib/data/conviction/focus-static-forecast-registry";
import { keyDateGuidance } from "../lib/presentation/key-date-guidance";
import { SectorKeyDateOverview } from "../components/conviction/SectorKeyDateOverview";

test("SNDK risk and stage start are not rendered as a sell/buy pair; sources remain unchanged", () => {
  const original = JSON.stringify(listStaticFocusForecasts("sandisk"));
  const rows = buildMemberKeyDateRadar("2026-09-04").filter((item) => item.assetId === "sandisk");
  const risk = rows.find((item) => item.focusDate === "2026-09-04")!;
  const stage = rows.find((item) => item.focusDate === "2026-09-07")!;
  assert.ok(risk && stage);
  assert.equal(risk.sourceDateType, "下跌风险");
  assert.equal(stage.sourceDateType, "上涨候选");
  assert.equal(keyDateGuidance(risk).label, "回撤风险观察");
  assert.match(keyDateGuidance(risk).note, /不代表当天见顶或必须卖出/);
  assert.match(keyDateGuidance(risk).note, /若此前没有明显冲高/);
  assert.equal(keyDateGuidance(stage).label, "休市 · 转强观察");
  assert.equal(keyDateGuidance(stage).nextSessionDate, "2026-09-08");
  assert.equal(keyDateGuidance(risk).group, "TURNING_RISK");
  assert.equal(keyDateGuidance(stage).group, "TURNING_RISK");
  assert.equal(stage.focusDate, "2026-09-07", "do not relabel the source as a Sept 8 bottom");
  assert.equal(stage.action, "BOTTOM_WATCH", "legacy research action is not silently rewritten");
  assert.equal(JSON.stringify(listStaticFocusForecasts("sandisk")), original);
});

test("weekends and Labor Day are closed for SNDK, but crypto remains open", () => {
  for (const focusDate of ["2026-09-05", "2026-09-06", "2026-09-07"]) {
    const base = { assetId: "sandisk", focusDate, action: "BOTTOM_WATCH" as const, sourceDateType: "阶段低点" as const };
    const before = JSON.stringify(base);
    const display = keyDateGuidance(base);
    assert.equal(display.closed, true);
    assert.equal(display.group, "TURNING_RISK");
    assert.equal(display.nextSessionDate, "2026-09-08");
    assert.match(display.label, /休市/);
    assert.equal(JSON.stringify(base), before);
    assert.equal(keyDateGuidance({ ...base, assetId: "btc" }).closed, false);
    assert.equal(keyDateGuidance({ ...base, assetId: "btc" }).group, "BOTTOM_WATCH");
  }
  assert.equal(keyDateGuidance({ assetId: "sandisk", focusDate: "2026-09-08", action: "BOTTOM_WATCH", sourceDateType: "上涨候选" }).group, "TURNING_RISK");
  const commodity = keyDateGuidance({ assetId: "gold", focusDate: "2026-09-07", action: "TOP_EXIT_WATCH" });
  assert.equal(commodity.group, "TURNING_RISK");
  assert.match(commodity.label, /时段待核实/);
  assert.equal(commodity.nextSessionDate, null, "do not apply an equity reopening date to all commodity contracts");
});

test("an explicit top or bottom remains a candidate, other date types stay timing only", () => {
  for (const [sourceDateType, action, group, label] of [
    ["阶段高点", "TOP_EXIT_WATCH", "TOP_EXIT_WATCH", "高点候选"],
    ["阶段低点", "BOTTOM_WATCH", "BOTTOM_WATCH", "低点候选"],
    ["下跌风险", "TOP_EXIT_WATCH", "TURNING_RISK", "回撤风险观察"],
    ["上涨候选", "BOTTOM_WATCH", "TURNING_RISK", "转强观察"],
    ["突破确认", "TURNING_RISK", "TURNING_RISK", "突破观察"],
    ["波动放大", "TURNING_RISK", "TURNING_RISK", "节奏观察"],
  ] as const) {
    const display = keyDateGuidance({ assetId: "sandisk", focusDate: "2026-09-04", action, sourceDateType });
    assert.equal(display.group, group);
    assert.equal(display.label, label);
  }
});

test("production summary renders the correction, holiday and original caveat without escape-top labels", () => {
  const board = buildSectorResonanceBoard("2026-09-04");
  const windows = buildSectorKeyDateWindows({ weeks: board.weeks, rows: board.rows, keyDates: buildMemberKeyDateRadar("2026-09-04"), asOfDate: "2026-09-04" });
  Object.assign(globalThis, { React });
  const html = renderToStaticMarkup(React.createElement(SectorKeyDateOverview, { windows }));
  assert.match(html, /闪迪日期更正/);
  assert.match(html, /回撤风险观察/);
  assert.match(html, /休市 · 转强观察/);
  assert.match(html, /2026-09-08恢复交易后观察/);
  assert.match(html, /若此前没有明显冲高/);
  assert.doesNotMatch(html, /逃顶／减仓观察|>抄底观察</);
  const page = readFileSync("app/member/key-dates/page.tsx", "utf8");
  assert.match(page, /keyDateGuidance\(item\)\.group === group.action/);
  assert.match(page, /\{guidance.label\}/);
  assert.match(page, /\{guidance.note\}/);
  assert.match(page, /SANDISK_KEY_DATE_CORRECTION/);
});
