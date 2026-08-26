export type AcceptanceLightStatus = "GREEN" | "YELLOW" | "RED";

export type AcceptanceLight = {
  key: "site" | "predictions" | "verification" | "collectors" | "trading";
  labelZh: string;
  status: AcceptanceLightStatus;
  detailZh: string;
  checkedAt: string;
};

type ContentInput = {
  generatedAt: string | null;
  status: "OK" | "ATTENTION" | null;
  problemKeys: string[];
};

type VerificationInput = {
  state: string | null;
  generatedSourceHealthy: boolean;
  syncMissing: number;
  latestVerifiedAt: string | null;
};

type CollectorInput = {
  status: string | null;
  ageMinutes: number | null;
  accountsSucceeded: number;
  accountsAttempted: number;
};

type TradingInput = {
  databaseReady: boolean;
  runtimePresent: boolean;
  serverHealthy: boolean;
  paused: boolean;
  pauseReason: string;
  heartbeatAgeSeconds: number | null;
};

function ageMinutes(value: string | null, now: Date): number | null {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp)) return null;
  const age = (now.getTime() - timestamp) / 60_000;
  return age < -5 ? null : Math.max(0, age);
}

export function deriveLiveAcceptanceLights(input: {
  now: Date;
  databaseOk: boolean;
  databaseDetailZh?: string;
  content: ContentInput;
  verification: VerificationInput;
  collector: CollectorInput;
  trading: TradingInput;
}): AcceptanceLight[] {
  const checkedAt = input.now.toISOString();
  const contentAge = ageMinutes(input.content.generatedAt, input.now);
  const contentFresh = contentAge != null && contentAge <= 30;
  const contentVeryStale = contentAge == null || contentAge > 60;
  const verificationHealthyStates = new Set(["ACTIVE", "WAITING", "SYNCING"]);

  return [
    {
      key: "site",
      labelZh: "网站与数据库",
      status: input.databaseOk ? "GREEN" : "RED",
      detailZh: input.databaseOk ? (input.databaseDetailZh || "网站运行、数据库只读探针正常。") : "数据库只读探针失败。",
      checkedAt,
    },
    {
      key: "predictions",
      labelZh: "预测内容新鲜度",
      status: contentVeryStale ? "RED" : contentFresh && input.content.status === "OK" ? "GREEN" : "YELLOW",
      detailZh: contentAge == null
        ? "尚无自动内容自检报告。"
        : `${Math.round(contentAge)}分钟前自检；${input.content.problemKeys.length ? `需关注：${input.content.problemKeys.join("、")}` : "核心栏目覆盖正常"}。`,
      checkedAt,
    },
    {
      key: "verification",
      labelZh: "行情与验证流水线",
      status: !input.verification.generatedSourceHealthy
        ? "RED"
        : input.verification.state === "SYNCING"
          ? "YELLOW"
          : input.verification.syncMissing > 0 || input.verification.state === "SYNC_GAP"
            ? "RED"
            : verificationHealthyStates.has(input.verification.state ?? "") ? "GREEN" : "YELLOW",
      detailZh: `状态 ${input.verification.state ?? "UNKNOWN"}；同步缺口 ${input.verification.syncMissing}；最近验证 ${input.verification.latestVerifiedAt ?? "暂无"}。`,
      checkedAt,
    },
    {
      key: "collectors",
      labelZh: "X／外部研究采集",
      status: input.collector.accountsAttempted <= 0 || input.collector.accountsSucceeded <= 0
        ? "RED"
        : input.collector.status === "HEALTHY" && input.collector.accountsSucceeded === input.collector.accountsAttempted
          ? "GREEN"
          : input.collector.status === "HEALTHY" || input.collector.status === "ERROR" ? "YELLOW" : "RED",
      detailZh: `状态 ${input.collector.status ?? "UNKNOWN"}；心跳 ${input.collector.ageMinutes == null ? "未知" : `${Math.round(input.collector.ageMinutes)}分钟`}; 账户 ${input.collector.accountsSucceeded}/${input.collector.accountsAttempted}。`,
      checkedAt,
    },
    {
      key: "trading",
      labelZh: "AI交易托管心跳",
      status: !input.trading.databaseReady || !input.trading.runtimePresent
        ? "RED"
        : input.trading.serverHealthy
          ? "GREEN"
          : input.trading.paused && input.trading.heartbeatAgeSeconds != null && input.trading.heartbeatAgeSeconds <= 180
            ? "YELLOW"
            : "RED",
      detailZh: input.trading.runtimePresent
        ? `${input.trading.paused ? "安全暂停" : "运行中"}；心跳 ${input.trading.heartbeatAgeSeconds == null ? "未知" : `${input.trading.heartbeatAgeSeconds}秒`}。`
        : "未找到交易运行状态。",
      checkedAt,
    },
  ];
}
