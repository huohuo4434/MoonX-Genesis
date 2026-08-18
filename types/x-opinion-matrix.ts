export type XOpinionDirection = "LONG" | "SHORT" | "NEUTRAL";
export type XOpinionApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type XOpinionAsset = { code: string; label: string; aliases: string[] };
export type XOpinionApproval = {
  id: string;
  username: string;
  postId: string;
  symbol: string;
  status: XOpinionApprovalStatus;
  weightPct: number;
  displayAllowed: boolean;
  note: string | null;
  updatedAt: string;
};
export type XOpinionCell = {
  username: string;
  family: string;
  symbol: string;
  postId: string;
  postUrl: string;
  postedAt: string;
  direction: XOpinionDirection;
  confidence: number;
  summary: string;
  levels: number[];
  timeWindows: string[];
  approval: XOpinionApproval | null;
};
export type XOpinionMatrix = {
  generatedAt: string;
  lookbackDays: number;
  assets: readonly XOpinionAsset[];
  rows: Array<{ username: string; family: string; cells: Record<string, XOpinionCell | null> }>;
};
