import { z } from "zod";

const text = z.object({ zh: z.string().trim().min(1), en: z.string().trim().min(1) }).strict();
const date = z.string().datetime({ offset: true });
const positive = z.number().finite().positive();
export const REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
const pickSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), title: text, summary: text,
  symbol: z.string().min(1), venue: z.string().min(1), currency: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]), horizon: text,
  publishedAt: date, validFrom: date, validUntil: date,
  sourcePublishedAt: date, sourceLockedAt: date, sourceRef: z.string().min(1),
  entry: z.tuple([positive, positive]), stop: positive,
  targets: z.tuple([positive, positive]), costAllowance: z.number().finite().nonnegative(),
  trigger: text, invalidation: text,
}).strict().superRefine((p, ctx) => {
  const published = Date.parse(p.publishedAt);
  if (!(Date.parse(p.sourcePublishedAt) <= Date.parse(p.sourceLockedAt) && Date.parse(p.sourceLockedAt) <= published && published <= Date.parse(p.validFrom) && Date.parse(p.validFrom) < Date.parse(p.validUntil)))
    ctx.addIssue({ code: "custom", message: "Source must be locked before release; the observation window must start after publication." });
  const [low, high] = p.entry;
  const [t1, t2] = p.targets;
  const geometry = low <= high && (p.side === "LONG" ? p.stop < low && high < t1 && t1 < t2 : t2 < t1 && t1 < low && high < p.stop);
  const risk = (p.side === "LONG" ? high - p.stop : p.stop - low) + p.costAllowance;
  const reward = (p.side === "LONG" ? t1 - high : low - t1) - p.costAllowance;
  if (!geometry || reward / risk < 2) ctx.addIssue({ code: "custom", message: "Require valid levels and at least 2:1 to the first target at the worst entry, after estimated costs." });
});
const reviewSchema = z.object({
  pickId: z.string(), reviewedAt: date,
  outcome: z.enum(["TARGET", "STOP", "PARTIAL", "NOT_TRIGGERED", "CANCELLED"]),
  note: text, evidenceUrl: z.string().url().startsWith("https://"),
}).strict();
export const freePicksCatalogSchema = z.object({
  lastCheckedAt: date, checkNote: text,
  picks: z.array(pickSchema), reviews: z.array(reviewSchema),
}).strict().superRefine((catalog, ctx) => {
  const ids = new Set<string>();
  const sorted = [...catalog.picks].sort((a,b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
  sorted.forEach((p, i) => {
    if (ids.has(p.id)) ctx.addIssue({ code: "custom", message: "Duplicate release ID" });
    ids.add(p.id);
    if (i && Date.parse(p.publishedAt) - Date.parse(sorted[i-1]!.publishedAt) < REVIEW_INTERVAL_MS)
      ctx.addIssue({ code: "custom", message: "Allow at most one free pick per 72 hours" });
  });
  const reviewed = new Set<string>();
  for (const r of catalog.reviews) {
    const p = catalog.picks.find(p => p.id === r.pickId);
    if (!p || reviewed.has(r.pickId) || Date.parse(r.reviewedAt) < Date.parse(p.validUntil))
      ctx.addIssue({ code: "custom", message: "One final review per release, after its observation window closes" });
    reviewed.add(r.pickId);
  }
});
export type FreePicksCatalog = z.infer<typeof freePicksCatalogSchema>;
export type FreePick = FreePicksCatalog["picks"][number];
export function pickStatus(pick: FreePick, now: number) {
  return now < Date.parse(pick.validFrom) ? "SCHEDULED" : now >= Date.parse(pick.validUntil) ? "EXPIRED" : "OBSERVING";
}
