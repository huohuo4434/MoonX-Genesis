export type ContentFreshnessStatus = "OK" | "STALE" | "MISSING" | "ATTENTION";
export type ContentFreshnessPolicy = {
  key: string;
  label: string;
  scheduleZh: string;
  hardDeadlineZh: string;
  repairMode: "AUTO" | "CHECK_ONLY";
  noteZh: string;
};
export type ContentFreshnessItem = {
  key: string;
  label: string;
  status: ContentFreshnessStatus;
  detailZh: string;
  ready: number | null;
  expected: number | null;
  lastUpdatedAt: string | null;
  repairable: boolean;
};
export type ContentFreshnessReport = {
  version: 1;
  generatedAt: string;
  beijingDate: string;
  status: "OK" | "ATTENTION";
  items: ContentFreshnessItem[];
  policies: readonly ContentFreshnessPolicy[];
  repairs: Array<{ key: string; ok: boolean; actionZh: string; detailZh: string }>;
  noteZh: string;
};
