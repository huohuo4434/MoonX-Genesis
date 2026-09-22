/** Fixed categories only: never log a raw provider error, URL, identifier or stack. */
export function classifyMemberDeskSyncError(error: unknown): string {
  if (!(error instanceof Error)) return "UNKNOWN";
  switch (error.message) {
    case "交易台设置读取超时": return "SETTINGS_READ_TIMEOUT";
    case "交易台快照读取超时": return "SNAPSHOT_READ_TIMEOUT";
    case "会员交易台设置缺失": return "SETTINGS_MISSING";
    case "交易数据库未连接":
    case "交易数据库未连接。": return "DATABASE_UNAVAILABLE";
    case "快照读取超过发布预算。": return "PUBLISH_BUDGET_EXCEEDED";
    case "快照未写入：记录缺失或已有更新版本。": return "SNAPSHOT_WRITE_NOT_APPLIED";
  }
  const code = "code" in error ? error.code : undefined;
  if (code === "P1001" || code === "P1002" || code === "P2024") return "DATABASE_CONNECTION_OR_POOL";
  if (error.name === "AbortError" || error.name === "TimeoutError") return "UPSTREAM_ABORT_OR_TIMEOUT";
  return "UNKNOWN";
}
