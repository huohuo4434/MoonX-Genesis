import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    return new PrismaClient();
  } catch {
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export function hasPrisma(): boolean {
  return Boolean(prisma && process.env.DATABASE_URL?.trim());
}
