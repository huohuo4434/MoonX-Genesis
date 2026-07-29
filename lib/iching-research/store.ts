/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { prisma } from "@/lib/prisma";

type PrismaDB = NonNullable<typeof prisma>;

export type IChingResearchForAdmin = NonNullable<
  Awaited<ReturnType<typeof listIChingResearchForAdmin>>
>[number];

export type IChingResearchListFilter = {
  assetId?: string;
  sourceType?: "MASTER" | "INTERNAL";
  researchStatus?: string;
  verified?: "YES" | "NO";
  questionQuery?: string;
};

export async function listIChingResearchForAdmin(filter: IChingResearchListFilter) {
  const db = prisma;
  if (!db) throw new Error("Prisma is not configured (missing DATABASE_URL).");

  const where: Record<string, unknown> = {};
  if (filter.assetId) where.assetId = filter.assetId;
  if (filter.sourceType) where.sourceType = filter.sourceType;
  if (filter.researchStatus) where.researchStatus = filter.researchStatus;

  // Simple text search (admin-only). For better full-text search, later add dedicated index.
  if (filter.questionQuery && filter.questionQuery.trim()) {
    const q = filter.questionQuery.trim();
    where.OR = [
      { question: { contains: q, mode: "insensitive" } },
      { masterOriginalAnalysis: { contains: q, mode: "insensitive" } },
      { internalAnalysis: { contains: q, mode: "insensitive" } },
      { hexagramName: { contains: q } },
    ];
  }

  // verified filter uses IChingValidation existence
  if (filter.verified) {
    if (filter.verified === "YES") {
      where.validations = { some: {} };
    } else {
      where.validations = { none: {} };
    }
  }

  return db.iChingResearch.findMany({
    where: where as any,
    orderBy: { castAt: "desc" },
    include: {
      validations: { orderBy: { verifiedAt: "desc" }, take: 1 },
    },
  });
}

export async function getIChingResearchByIdForAdmin(id: string) {
  const db = prisma;
  if (!db) throw new Error("Prisma is not configured (missing DATABASE_URL).");
  return db.iChingResearch.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 20 },
      validations: { orderBy: { verifiedAt: "desc" }, take: 10 },
    },
  });
}

export async function createIChingResearchForAdmin(input: {
  data: Omit<
    Parameters<PrismaDB["iChingResearch"]["create"]>[0]["data"],
    "id" | "createdAt" | "updatedAt"
  > & {
    id: string;
  };
}) {
  const db = prisma;
  if (!db) throw new Error("Prisma is not configured (missing DATABASE_URL).");
  return db.iChingResearch.create({ data: input.data as any });
}

function snapshotForVersion(r: any) {
  // Convert Date to ISO for stable JSONB.
  const safe = { ...r };
  if (safe.castAt instanceof Date) safe.castAt = safe.castAt.toISOString();
  if (safe.createdAt instanceof Date) safe.createdAt = safe.createdAt.toISOString();
  if (safe.updatedAt instanceof Date) safe.updatedAt = safe.updatedAt.toISOString();
  return safe;
}

export async function updateIChingResearchWithVersionForAdmin(input: {
  researchId: string;
  patch: Partial<Omit<Parameters<PrismaDB["iChingResearch"]["update"]>[0]["data"], "id">>;
  changedBy?: string | null;
  changeReason: string;
}) {
  const db = prisma;
  if (!db) throw new Error("Prisma is not configured (missing DATABASE_URL).");
  const current = await db.iChingResearch.findUnique({ where: { id: input.researchId } });
  if (!current) throw new Error("IChingResearch not found");

  // Determine next version number
  const existingMax = await db.iChingResearchVersion.aggregate({
    where: { researchId: input.researchId },
    _max: { version: true },
  });
  const nextVersion = (existingMax._max.version ?? 0) + 1;

  const snapshot = snapshotForVersion(current);
  await db.$transaction(async (tx) => {
    await tx.iChingResearchVersion.create({
      data: {
        id: `ichv-${input.researchId}-${nextVersion}-${Date.now()}`,
        researchId: input.researchId,
        version: nextVersion,
        snapshot,
        changeReason: input.changeReason,
        changedBy: input.changedBy ?? null,
      },
    });

    const updated = await tx.iChingResearch.update({
      where: { id: input.researchId },
      data: {
        ...input.patch,
        updatedBy: input.changedBy ?? undefined,
      } as any,
    });

    return updated;
  });
}

