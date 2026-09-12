import { isXAttribution, parseSignupAttributionTouch } from "./signup-attribution-core";

export type GrowthUser = { id: string; email: string; createdAt: string; expiresAt: string | null; active: boolean; firstTouch?: unknown; lastTouch?: unknown };
export type GrowthPayment = { id: string; userId: string; network: string; tx: string; at: string | null; confirmed: boolean; refunded?: boolean; test?: boolean };
const DAY = 86_400_000;
const time = (value: string | null) => value ? Date.parse(value) : NaN;

/** Observed, non-refunded payment evidence only. Never infer payment from entitlement.
 * Repeat purchase is NOT a renewal rate; historical due cohorts are not reconstructed. */
export function summarizeMemberGrowth(users: GrowthUser[], payments: GrowthPayment[], now = new Date()) {
  const clock = now.getTime();
  if (!Number.isFinite(clock)) throw new Error("Invalid report time");
  const byUser = new Map(users.map(u => [u.id, u]));
  const groups = new Map<string, GrowthPayment[]>();
  let unresolved = 0;
  for (const p of payments) {
    if (p.test || !byUser.has(p.userId)) continue;
    if (!p.confirmed && !p.refunded) continue;
    const network = /^(TRC20|TRON)$/i.test(p.network) ? "TRON" : /^(BEP20|BSC)$/i.test(p.network) ? "BSC" : p.network.toUpperCase();
    const tx = p.tx.trim().toLowerCase();
    if (!network || !tx) { unresolved++; continue; }
    const key = `${network}:${tx}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const accepted: Array<GrowthPayment & { timestamp: number }> = [];
  for (const rows of groups.values()) {
    if (rows.some(p => p.refunded)) continue;
    if (new Set(rows.map(p => p.userId)).size > 1) { unresolved++; continue; }
    const valid = rows.filter(p => p.confirmed && Number.isFinite(time(p.at)) && time(p.at) <= clock
      && time(p.at) >= time(byUser.get(p.userId)!.createdAt));
    if (!valid.length) { unresolved++; continue; }
    const first = valid.sort((a, b) => time(a.at) - time(b.at))[0]!;
    accepted.push({ ...first, timestamp: time(first.at) });
  }
  accepted.sort((a, b) => a.timestamp - b.timestamp);
  const history = new Map<string, typeof accepted>();
  for (const payment of accepted) history.set(payment.userId, [...(history.get(payment.userId) ?? []), payment]);
  const validUsers = users.filter(u => Number.isFinite(time(u.createdAt)) && time(u.createdAt) <= clock);
  const xSource = (u: GrowthUser) => {
    // Acquisition after registration cannot be credited with acquiring that registration.
    return [u.firstTouch, u.lastTouch].some(raw => {
      const touch = parseSignupAttributionTouch(raw);
      return touch && time(touch.capturedAt) <= time(u.createdAt) && isXAttribution(touch);
    });
  };
  const windows = [7, 30].map(days => {
    const cutoff = clock - days * DAY;
    const cohort = validUsers.filter(u => time(u.createdAt) >= cutoff);
    const xs = cohort.filter(xSource);
    const cohortPaid = cohort.filter(u => history.has(u.id)).length;
    const xPaid = xs.filter(u => history.has(u.id)).length;
    const period = accepted.filter(p => p.timestamp >= cutoff);
    return { days, registrations: cohort.length,
      tracked: cohort.filter(u => [u.firstTouch, u.lastTouch].some(raw => {
        const touch = parseSignupAttributionTouch(raw);
        return touch && time(touch.capturedAt) <= time(u.createdAt);
      })).length,
      xRegistrations: xs.length, xPaid, cohortPaid,
      xPaidPercent: xs.length ? Math.round(xPaid / xs.length * 1000) / 10 : null,
      confirmedOrders: period.length,
      firstObservedBuyers: [...history.values()].filter(rows => rows[0]!.timestamp >= cutoff).length,
      repeatBuyers: new Set(period.filter(p => history.get(p.userId)![0] !== p).map(p => p.userId)).size };
  });
  const paidUsers = validUsers.filter(u => history.has(u.id));
  const expiring = paidUsers.filter(u => u.active && time(u.expiresAt) > clock && time(u.expiresAt) <= clock + 7 * DAY);
  const lapsed = paidUsers.filter(u => !u.active && time(u.expiresAt) <= clock && time(u.expiresAt) >= clock - 30 * DAY);
  return { asOf: now.toISOString(), windows, confirmedPayers: paidUsers.length, unresolved,
    activeWithPayment: paidUsers.filter(u => u.active).length,
    activeWithoutPayment: validUsers.filter(u => u.active && !history.has(u.id)).length,
    expiring: expiring.sort((a, b) => time(a.expiresAt) - time(b.expiresAt)),
    lapsed: lapsed.sort((a, b) => time(b.expiresAt) - time(a.expiresAt)) };
}
