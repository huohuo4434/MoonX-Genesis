import { MEMBER_METHODOLOGIES, type MemberMethodologyId, type MemberMethodologySelection } from "@/types/member-methodology";

type Condition = { key?: unknown; label?: unknown; value?: unknown; met?: unknown };

export function parseMemberMethodologyId(value: unknown): MemberMethodologyId {
  const normalized = String(value ?? "LIUYAO_CHAN").trim().toUpperCase();
  return MEMBER_METHODOLOGIES.some((item) => item.id === normalized)
    ? normalized as MemberMethodologyId
    : "LIUYAO_CHAN";
}

function rows(value: unknown): Condition[] {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(parsed) ? parsed.filter((item): item is Condition => Boolean(item && typeof item === "object")) : [];
}

function text(condition: Condition): string {
  return `${typeof condition.label === "string" ? condition.label : ""} ${typeof condition.value === "string" ? condition.value : ""}`.trim();
}

export function buildMemberMethodologySelection(input: { selected: unknown; conditions: unknown; chanAvailable: boolean }): MemberMethodologySelection {
  const selected = parseMemberMethodologyId(input.selected);
  const conditions = rows(input.conditions);
  const liuyaoRows = conditions.filter((row) => row.key === "hexagram" || /六爻/.test(text(row)));
  const qimenRows = conditions.filter((row) => /奇门/.test(text(row)));
  const unavailable = /(?:当前无|没有|缺失|未锁定|暂无)/;
  const conflict = /(?:冲突|相反|反向|不一致)/;
  const aligned = /(?:同向|一致|共振|确认|支持)/;
  const liuyaoAvailable = liuyaoRows.some((row) => !unavailable.test(text(row)) && !conflict.test(text(row)) && row.met === true);
  const qimenAvailable = qimenRows.some((row) => !unavailable.test(text(row)) && !conflict.test(text(row)) && aligned.test(text(row)) && row.met === true);
  const chanAvailable = input.chanAvailable;
  const needsLiuyao = ["LIUYAO", "LIUYAO_QIMEN", "LIUYAO_CHAN", "LIUYAO_QIMEN_CHAN"].includes(selected);
  const needsQimen = ["QIMEN", "LIUYAO_QIMEN", "QIMEN_CHAN", "LIUYAO_QIMEN_CHAN"].includes(selected);
  const needsChan = ["LIUYAO_CHAN", "QIMEN_CHAN", "LIUYAO_QIMEN_CHAN"].includes(selected);
  const missing = [
    needsLiuyao && !liuyaoAvailable ? "当前计划没有可追溯且同向的六爻证据" : "",
    needsQimen && !qimenAvailable ? "当前计划没有可追溯且同向的奇门证据" : "",
    needsChan && !chanAvailable ? "缠论多周期结构尚未完整" : "",
  ].filter(Boolean);
  const label = MEMBER_METHODOLOGIES.find((item) => item.id === selected)?.label ?? selected;
  return { selected, label, trial: true, liuyaoAvailable, qimenAvailable, chanAvailable, eligible: missing.length === 0, reason: missing.length ? missing.join("；") : `${label}证据齐全；仍需通过统一行情、仓位、止损和账户风控。` };
}
