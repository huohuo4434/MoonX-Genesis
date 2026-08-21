export type MemberMethodologyId =
  | "LIUYAO"
  | "QIMEN"
  | "LIUYAO_QIMEN"
  | "LIUYAO_CHAN"
  | "QIMEN_CHAN"
  | "LIUYAO_QIMEN_CHAN";

export type MemberMethodologySelection = {
  selected: MemberMethodologyId;
  label: string;
  trial: true;
  liuyaoAvailable: boolean;
  qimenAvailable: boolean;
  chanAvailable: boolean;
  eligible: boolean;
  reason: string;
};

export const MEMBER_METHODOLOGIES = [
  { id: "LIUYAO", label: "1. 六爻", description: "六爻锁定方向；真实执行仍必须通过统一价格与风险闸门。" },
  { id: "QIMEN", label: "2. 奇门", description: "奇门信号与正式方向一致时才进入候选；分歧时等待。" },
  { id: "LIUYAO_QIMEN", label: "3. 六爻＋奇门共振", description: "六爻与奇门同向才进入候选。" },
  { id: "LIUYAO_CHAN", label: "4. 六爻＋缠论", description: "六爻定方向，缠论确认结构和入场位置。" },
  { id: "QIMEN_CHAN", label: "5. 奇门＋缠论", description: "奇门信号与正式方向一致，再由缠论确认位置。" },
  { id: "LIUYAO_QIMEN_CHAN", label: "6. 六爻＋奇门＋缠论共振", description: "三层证据齐全且同向才进入候选，信号最少。" },
] as const satisfies ReadonlyArray<{ id: MemberMethodologyId; label: string; description: string }>;
