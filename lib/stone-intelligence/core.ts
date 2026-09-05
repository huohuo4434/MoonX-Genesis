import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const httpsUrl = z.string().url().max(1000).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Only credential-free HTTPS links are allowed");
const sourceUrl = httpsUrl.refine((value) => {
  const url = new URL(value);
  return ["patreon.com", "www.patreon.com"].includes(url.hostname);
}, "Patreon source required");
export const stoneBatchSchema = z.object({
  observedAt: z.string().datetime().refine((value) => Date.parse(value) >= Date.UTC(2000, 0, 1) && Date.parse(value) < Date.UTC(2100, 0, 1), "Observation must be between 2000 and 2099"),
  coverage: z.array(z.object({
    source: z.enum(["ARTICLES", "SERIOUS_CHAT", "FREE_CHAT"]),
    url: sourceUrl, range: text(240),
    status: z.enum(["CHECKED", "PARTIAL", "BLOCKED"]),
  }).strict()).min(1).max(3),
  assessment: text(1600),
  findings: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,99}$/),
    source: z.enum(["ARTICLES", "SERIOUS_CHAT", "FREE_CHAT"]),
    sourceUrl, author: text(80), asset: text(80), title: text(120),
    publishedTimeLabel: text(100),
    summary: text(420),
    status: z.enum(["FACT_CHECKED", "WATCHING", "UNVERIFIED", "CONTRADICTED", "EXPIRED"]),
    evidenceUrls: z.array(httpsUrl).max(5),
    followUp: text(320),
    alignment: text(240),
  }).strict()).max(30),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.findings.map((x) => x.id)).size !== value.findings.length) ctx.addIssue({ code: "custom", message: "Duplicate finding ID" });
  if (new Set(value.coverage.map((x) => x.source)).size !== value.coverage.length) ctx.addIssue({ code: "custom", message: "Duplicate coverage source" });
  if (value.findings.some((x) => x.status === "FACT_CHECKED" && x.evidenceUrls.length === 0)) ctx.addIssue({ code: "custom", message: "Checked facts require evidence links" });
});
export type StoneBatch = z.infer<typeof stoneBatchSchema>;
export type StoneSavedBatch = StoneBatch & { storedAt: string; key: string };
export const STONE_SOURCE_LABELS = { ARTICLES: "Stone 文章", SERIOUS_CHAT: "严肃股票讨论群", FREE_CHAT: "自由聊天群" };
export const STONE_STATUS_LABELS = { FACT_CHECKED: "事实已核对", WATCHING: "观察中", UNVERIFIED: "未核实", CONTRADICTED: "证据不符", EXPIRED: "已过期" };

export function sortStoneBatches(batches: StoneSavedBatch[]) {
  return [...batches].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || Date.parse(b.storedAt) - Date.parse(a.storedAt) || b.key.localeCompare(a.key));
}

export function latestStoneFindings(batches: StoneSavedBatch[]) {
  const latest = new Map<string, StoneBatch["findings"][number] & { observedAt: string }>();
  for (const batch of sortStoneBatches(batches)) {
    for (const item of batch.findings) if (!latest.has(item.id)) latest.set(item.id, { ...item, observedAt: batch.observedAt });
  }
  return [...latest.values()];
}
