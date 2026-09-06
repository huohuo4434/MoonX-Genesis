/** Only persisted lifecycle evidence may remove a deadline. A pending UI draft is not authority. */
export type LiveDurationInput = {
  status: string;
  durationMode?: string | null;
  startedAt: Date | string | null;
  endsAt: Date | string | null;
};

export function evaluateLiveDuration(input: LiveDurationInput, now = new Date()) {
  // Missing mode means an old fixed-duration record, never continuous operation.
  const mode = input.durationMode == null ? "FIXED" : input.durationMode;
  const start = input.startedAt ? new Date(input.startedAt).getTime() : NaN;
  const end = input.endsAt ? new Date(input.endsAt).getTime() : NaN;
  const clock = now.getTime();
  const valid = Number.isFinite(clock) && Number.isFinite(start)
    && (mode === "CONTINUOUS" ? input.endsAt === null
      : mode === "FIXED" && Number.isFinite(end) && start < end);
  const expired = valid && mode === "FIXED" && clock >= end;
  const due = valid && clock >= start;
  return { mode, valid, expired, due, active: input.status === "ACTIVE" && valid && due && !expired };
}
