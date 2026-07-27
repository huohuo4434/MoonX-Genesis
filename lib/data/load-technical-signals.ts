import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { TechnicalSignalSchema, TechnicalVerificationRecordSchema } from "@/lib/schemas/technical-signal";
import { weeklyDivergenceWatchPool } from "@/lib/data/weekly-divergence-pool";
import type { TechnicalSignal, TechnicalVerificationRecord } from "@/types/technical-signal";

const signalPath = path.join(process.cwd(), "content", "moonx", "technical-signals.json");
const verificationPath = path.join(process.cwd(), "content", "moonx", "technical-verifications.json");

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    if (process.env.NODE_ENV !== "production") console.error(`[technical-signals] ${filePath} must contain a JSON array`);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error(`[technical-signals] Unable to read ${filePath}`, error);
  }
  return [];
}

function logInvalidRecord(kind: string, index: number, value: unknown, issues: string): void {
  if (process.env.NODE_ENV !== "production") {
    const id = value && typeof value === "object" && "id" in value ? String(value.id) : `index:${index}`;
    console.error(`[technical-signals] Skipping invalid ${kind} record ${id}: ${issues}`);
  }
}

export async function listTechnicalSignals(): Promise<TechnicalSignal[]> {
  const records = await readJsonArray(signalPath);
  const parsed = records.flatMap((record, index) => {
    const result = TechnicalSignalSchema.safeParse(record);
    if (result.success) return [result.data];
    logInvalidRecord("signal", index, record, result.error.issues.map((issue) => issue.message).join("; "));
    return [];
  });
  return [...parsed, ...weeklyDivergenceWatchPool];
}

export async function listTechnicalVerifications(): Promise<TechnicalVerificationRecord[]> {
  const records = await readJsonArray(verificationPath);
  return records.flatMap((record, index) => {
    const result = TechnicalVerificationRecordSchema.safeParse(record);
    if (result.success) return [result.data];
    logInvalidRecord("verification", index, record, result.error.issues.map((issue) => issue.message).join("; "));
    return [];
  });
}

export async function listTechnicalSignalsForAsset(assetId: string): Promise<TechnicalSignal[]> {
  return (await listTechnicalSignals()).filter((signal) => signal.assetId === assetId);
}
