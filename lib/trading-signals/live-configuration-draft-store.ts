import { prisma } from "@/lib/prisma";
import { LIVE_CONFIGURATION_DRAFT_CODE, parseLiveConfigurationDraft, readLiveConfigurationDraftEvent } from "./live-configuration-draft-core";

export async function getLiveConfigurationDraft() {
  if (!prisma) throw new Error("CONFIGURATION_UNAVAILABLE");
  const account = await prisma.mooxUnifiedLiveAccount.findUnique({ where: { ownerKey: "official" }, select: { id: true } });
  if (!account) throw new Error("CONFIGURATION_UNAVAILABLE");
  const row = await prisma.mooxUnifiedLiveEvent.findFirst({
    where: { accountId: account.id, code: LIVE_CONFIGURATION_DRAFT_CODE },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return readLiveConfigurationDraftEvent(row);
}

export async function saveLiveConfigurationDraft(input: {
  draft: unknown; expectedRevision: string | null; requestId: string; actorId: string;
}) {
  const draft = parseLiveConfigurationDraft(input.draft);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)
    || !input.actorId || (input.expectedRevision !== null && (typeof input.expectedRevision !== "string" || input.expectedRevision.length > 100))) throw new Error("INVALID_CONFIGURATION");
  if (!prisma) throw new Error("CONFIGURATION_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    // Serialize only configuration writers on the existing account row. No mode UPDATE.
    const accounts = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "MooxUnifiedLiveAccount" WHERE "ownerKey" = 'official' FOR UPDATE
    `;
    const accountId = accounts[0]?.id;
    if (!accountId) throw new Error("CONFIGURATION_UNAVAILABLE");
    const id = `live-config:${input.requestId}`;
    const existing = await tx.mooxUnifiedLiveEvent.findUnique({ where: { id } });
    if (existing) {
      if (existing.accountId !== accountId || existing.code !== LIVE_CONFIGURATION_DRAFT_CODE
        || JSON.parse(existing.detail).actorId !== input.actorId
        || JSON.stringify(readLiveConfigurationDraftEvent(existing).draft) !== JSON.stringify(draft)) throw new Error("CONFIGURATION_CONFLICT");
      return readLiveConfigurationDraftEvent(existing);
    }
    const latest = await tx.mooxUnifiedLiveEvent.findFirst({
      where: { accountId, code: LIVE_CONFIGURATION_DRAFT_CODE }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    // Verify stored evidence before allowing a successor; never silently replace corruption.
    readLiveConfigurationDraftEvent(latest);
    if ((latest?.id ?? null) !== input.expectedRevision) throw new Error("CONFIGURATION_CONFLICT");
    // Keep ordering monotonic even if two servers' local clocks differ.
    const createdAt = new Date(Math.max(Date.now(), latest ? latest.createdAt.getTime() + 1 : 0));
    const row = await tx.mooxUnifiedLiveEvent.create({ data: {
      id, accountId, code: LIVE_CONFIGURATION_DRAFT_CODE, severity: "INFO", createdAt,
      detail: JSON.stringify({ ...draft, actorId: input.actorId, previousRevision: input.expectedRevision }),
    } });
    return readLiveConfigurationDraftEvent(row);
  });
}
