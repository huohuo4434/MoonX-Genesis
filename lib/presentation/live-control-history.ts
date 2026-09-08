export type LiveControlHistoryView = { available: boolean; latest: { at: string; label: string } | null };

// Only fixed labels reach the UI: no raw event JSON, actor identity or exchange errors.
export function presentLiveControlHistory(history: {
  available: boolean; latest: { code: string; detail: string; createdAt: Date | string } | null;
}): LiveControlHistoryView {
  const row = history.latest;
  if (!row) return { available: history.available, latest: null };
  const at = new Date(row.createdAt);
  if (!Number.isFinite(at.getTime())) return { available: false, latest: null };
  let label = "历史开关变更，详情待核查";
  if (row.code === "CUSTODY_NEW_ENTRIES_FROZEN") {
    const reasons: Record<string, string> = {
      PROTECTION_MISSING: "交易所止盈止损保护不完整", SNAPSHOT_UNAVAILABLE: "交易所快照未取得",
      ORPHAN_EXCHANGE_POSITION: "交易所仓位尚未托管", ORPHAN_EXCHANGE_PROTECTION: "存在残留保护单",
      UNKNOWN_EXCHANGE_PROTECTION_SIDE: "保护单方向未确认", TIME_EXIT_DUE: "仓位持有期限已到",
      DUPLICATE_SLICE: "托管记录重复",
    };
    const found = Object.entries(reasons).filter(([code]) => new RegExp(`\\b${code}\\b`).test(row.detail)).map(([, text]) => text);
    label = `系统保护暂停：${found.join("；") || "托管检查异常"}`;
  } else if (row.code === "ADMIN_MODE_CHANGED") {
    try {
      const mode = (JSON.parse(row.detail) as { mode?: unknown }).mode;
      label = mode === "LIVE" ? "管理员开启新开仓许可" : mode === "MANAGE_ONLY" ? "管理员关闭新开仓、保留仓位管理" : mode === "PAUSED" ? "管理员暂停账户" : label;
    } catch { /* Malformed history must not become a claim of success. */ }
  }
  return { available: history.available, latest: { at: at.toISOString(), label } };
}
