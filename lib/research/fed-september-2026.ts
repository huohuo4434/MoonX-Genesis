// Immutable pre-meeting editorial record. Append a dated review; never overwrite v1.
export const FED_SPECIAL = {
  id: "fed-september-2026-v1",
  path: "/fed-september-2026",
  versionDate: "2026-09-13",
  decisionAt: "2026-09-16T18:00:00Z",
  call: "HOLD",
  status: "AWAITING_OFFICIAL_RESULT",
  marketSnapshotDate: "2026-09-11",
  sources: [
    { title: "Federal Reserve · FOMC calendar", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
    { title: "BLS · August 2026 CPI (checked September 13)", url: "https://www.bls.gov/news.release/cpi.nr0.htm" },
    { title: "Kiplinger · September 11 CPI / FedWatch report", url: "https://www.kiplinger.com/investing/economy/cpi-report-august-2026-what-to-expect" },
    { title: "CME FedWatch · live probabilities / methodology", url: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html" },
  ],
} as const;

export function fedSpecialPhase(now: Date) {
  return now.getTime() < Date.parse(FED_SPECIAL.decisionAt) ? "PRE_MEETING" : "REVIEW_PENDING";
}

export function canReadFedSpecial(access: { authenticated: boolean }) {
  // This one editorial is free for every authenticated account, not paid-only.
  return access.authenticated === true;
}

export function judgeFedHold(previous: readonly [number, number], announced: readonly [number, number]) {
  if (![...previous, ...announced].every(Number.isFinite) || previous[0] >= previous[1] || announced[0] >= announced[1]) return "UNVERIFIABLE";
  return previous[0] === announced[0] && previous[1] === announced[1] ? "HIT" : "MISS";
}
