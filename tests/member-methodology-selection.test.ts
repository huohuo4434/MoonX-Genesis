import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMemberMethodologySelection, parseMemberMethodologyId } from "../lib/trading-signals/member-methodology-core";
import { MEMBER_METHODOLOGIES } from "../types/member-methodology";

const liuyao = { key: "hexagram", label: "六爻周卦", value: "正式锁定方向", met: true };
const qimen = { key: "qimen", label: "奇门时机", value: "与正式方向同向", met: true };

test("all six trial methods become eligible only when their required evidence exists", () => {
  for (const item of MEMBER_METHODOLOGIES) {
    const result = buildMemberMethodologySelection({
      selected: item.id,
      conditions: [liuyao, qimen],
      chanAvailable: true,
    });
    assert.equal(result.selected, item.id);
    assert.equal(result.trial, true);
    assert.equal(result.eligible, true, item.id);
  }
});

test("missing or conflicting evidence fails closed per selected method", () => {
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO", conditions: [], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO", conditions: [{ ...liuyao, met: undefined }], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO", conditions: [{ ...liuyao, value: "与正式方向反向" }], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "QIMEN", conditions: [{ ...qimen, value: "与正式方向冲突" }], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "QIMEN", conditions: [{ ...qimen, value: "仅用于时机参考" }], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO_QIMEN", conditions: [liuyao], chanAvailable: true }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO_CHAN", conditions: [liuyao], chanAvailable: false }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "QIMEN_CHAN", conditions: [qimen], chanAvailable: false }).eligible, false);
  assert.equal(buildMemberMethodologySelection({ selected: "LIUYAO_QIMEN_CHAN", conditions: [liuyao, qimen], chanAvailable: false }).eligible, false);
});

test("unknown method does not create a new execution path", () => {
  assert.equal(parseMemberMethodologyId("anything"), "LIUYAO_CHAN");
  assert.equal(parseMemberMethodologyId(null), "LIUYAO_CHAN");
});
