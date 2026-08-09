export type BilingualText = { zh: string; en: string };

export type WeeklyAlphaBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type WeeklyAlphaTechnical = {
  status: "READY" | "STATIC_LOCKED" | "UNAVAILABLE";
  support: string[];
  resistance: string[];
  confirmation: BilingualText;
  invalidation: BilingualText;
  bars: WeeklyAlphaBar[];
  supportNumeric?: number;
  resistanceNumeric?: number;
  lastClose?: number;
  snapshotLabel: BilingualText;
  note?: BilingualText;
};

export type WeeklyAlphaDayPath = {
  date: string;
  ganzhi: string;
  stage: BilingualText;
  path: BilingualText;
  isTradingDay: boolean;
};

export type WeeklyAlphaEntry = {
  rank: number;
  slug: string;
  assetName: BilingualText;
  symbol: string;
  venue: string;
  direction: "BULLISH" | "BEARISH";
  directionLabel: BilingualText;
  resonanceLabel: BilingualText;
  stars: 1 | 2 | 3 | 4 | 5;
  selectionReason: BilingualText[];
  primaryHexagram: string;
  changingHexagram?: string | null;
  hexagramFacts: BilingualText[];
  teacherInterpretation: BilingualText[];
  multiCycle: Array<{ horizon: BilingualText; direction: BilingualText; note: BilingualText }>;
  expectedPath: BilingualText;
  dayPath: WeeklyAlphaDayPath[];
  risks: BilingualText[];
  auditSourceIds: string[];
  technical: WeeklyAlphaTechnical;
};

export type WeeklyAlphaIssue = {
  id: string;
  version: number;
  title: BilingualText;
  subtitle: BilingualText;
  weekStart: string;
  weekEnd: string;
  publishedAt: string;
  calendarVerified: true;
  calendarSource: BilingualText;
  calendarRows: Array<{ date: string; ganzhi: string; xunKong: string }>;
  methodology: BilingualText[];
  selectionNote: BilingualText;
  entries: WeeklyAlphaEntry[];
};
