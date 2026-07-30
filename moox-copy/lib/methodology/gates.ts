import type { MethodologyModule } from "@/lib/methodology/types";

/**
 * Runtime gates so offline modules cannot be advertised as live.
 * Pure helper — safe for unit tests (no server-only import).
 */
export function applyRuntimeGates(
  modules: MethodologyModule[],
  opts?: { intelligenceSnapshotEnabled?: boolean }
): MethodologyModule[] {
  const intelOn = Boolean(opts?.intelligenceSnapshotEnabled);
  return modules.map((m) => {
    if (m.id === "analyst" && !intelOn) {
      return { ...m, enabled: false, publicDisplay: false };
    }
    return m;
  });
}
