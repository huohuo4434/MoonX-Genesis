function configuredCapacity(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(1, Math.min(10, Math.floor(value)));
}

/**
 * V4 is authoritative. When it is absent, the newly authorized policy defaults
 * to 10 instead of inheriting a superseded V3/unversioned limit. Independent
 * notional, loss, drawdown, leverage and protection gates still apply.
 */
export function resolveLiveCapacityV4(input: {
  v4: string | undefined;
  v3: string | undefined;
  legacy: string | undefined;
}): number {
  const v4 = configuredCapacity(input.v4);
  if (v4 != null) return v4;
  // V3 and the unversioned aliases expressed the superseded three-position
  // experiment. The explicitly authorized V4 policy defaults deterministically
  // to ten so an old single alias cannot silently keep production at three.
  void input.v3;
  void input.legacy;
  return 10;
}
