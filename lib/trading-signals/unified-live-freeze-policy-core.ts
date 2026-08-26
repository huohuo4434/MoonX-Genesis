import type { UnifiedLiveCustodyIssue } from "@/types/unified-live-trading";

/**
 * A transient read-only snapshot outage already blocks the current entry gate,
 * but must not permanently overwrite an explicit LIVE account intent. Every
 * custody-integrity blocker still requires an explicit audited restore.
 */
export function requiresPersistentManageOnly(issues: UnifiedLiveCustodyIssue[]): boolean {
  return issues.some(
    (issue) => issue.severity === "BLOCKER" && issue.code !== "SNAPSHOT_UNAVAILABLE",
  );
}
