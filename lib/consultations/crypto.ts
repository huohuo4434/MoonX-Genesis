import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.MOOX_CONSULTATION_DATA_KEY_V1?.trim();
  if (!raw) throw new Error("CONSULTATION_ENCRYPTION_KEY_UNAVAILABLE");
  const parsed = Buffer.from(raw, "base64");
  if (parsed.length !== 32) throw new Error("CONSULTATION_ENCRYPTION_KEY_INVALID");
  return parsed;
}
export function encryptConsultationPayload(value: unknown, context: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context,"utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { keyVersion: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}
export function decryptConsultationPayload<T>(row: { iv: string; tag: string; ciphertext: string }, context: string): T {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(row.iv, "base64"));
  decipher.setAAD(Buffer.from(context,"utf8"));
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8")) as T;
}
