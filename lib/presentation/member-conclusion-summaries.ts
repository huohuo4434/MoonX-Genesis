export type MarketStructureEvidenceRow = {
  price: number | null;
  chanConfirmation: number | null;
  chanInvalidation: number | null;
  fundingRate: number | null;
  openInterest: number | null;
  longShortRatio: number | null;
};

function finite(value: number | null): boolean {
  return value !== null && Number.isFinite(value);
}

export function hasMarketStructureEvidence(row: MarketStructureEvidenceRow): boolean {
  return [
    row.price,
    row.chanConfirmation,
    row.chanInvalidation,
    row.fundingRate,
    row.openInterest,
    row.longShortRatio,
  ].some(finite);
}

export function weeklyReportActions(hasLead: boolean): string[] {
  if (!hasLead) {
    return [
      "等待本周审核完成，不用低质量标的凑数。",
      "已发布的逐项研究仍可在周走势预测中查看。",
    ];
  }
  return [
    "先确认首要标的当前周期、关键位和失效条件。",
    "技术结构与正式方向同向后再考虑执行。",
    "已有仓位先检查保护单和相关性风险。",
  ];
}
