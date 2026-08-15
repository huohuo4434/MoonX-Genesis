import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getMembershipStatus } from "@/lib/auth/membership";

export type MemberSignalApiTokenView = {
  id: string;
  label: string;
  prefix: string;
  scopes: ["plans:read"];
  active: boolean;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type TokenRow = {
  id: string;
  user_id: string;
  label: string;
  token_prefix: string;
  token_hash: string;
  scopes: string[];
  active: boolean;
  expires_at: Date;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function map(row: TokenRow): MemberSignalApiTokenView {
  return {
    id: row.id,
    label: row.label,
    prefix: row.token_prefix,
    scopes: ["plans:read"],
    active: row.active,
    expiresAt: row.expires_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
  };
}

export async function createMemberSignalApiToken(input: {
  userId: string;
  label: string;
  expiresInDays: number;
}): Promise<{ token: string; credential: MemberSignalApiTokenView }> {
  if (!prisma) throw new Error("API凭证数据库未连接");
  const token = `mxm_${randomBytes(32).toString("base64url")}`;
  const id = `mst_${randomUUID()}`;
  const prefix = `${token.slice(0, 12)}…`;
  const expiresAt = new Date(Date.now() + Math.max(1, Math.min(365, input.expiresInDays)) * 86_400_000);
  const rows = await prisma.$queryRaw<TokenRow[]>`
    INSERT INTO member_signal_api_tokens (
      id, user_id, label, token_prefix, token_hash, scopes, active, expires_at
    ) VALUES (
      ${id}, ${input.userId}, ${input.label}, ${prefix}, ${hashToken(token)}, ARRAY['plans:read']::TEXT[], TRUE, ${expiresAt}
    ) RETURNING *
  `;
  return { token, credential: map(rows[0]!) };
}

export async function listMemberSignalApiTokens(userId: string): Promise<MemberSignalApiTokenView[]> {
  if (!prisma) return [];
  const rows = await prisma.$queryRawUnsafe<TokenRow[]>(
    "SELECT * FROM member_signal_api_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    userId
  );
  return rows.map(map);
}

export async function revokeMemberSignalApiToken(userId: string, id: string): Promise<boolean> {
  if (!prisma) throw new Error("API凭证数据库未连接");
  const changed = await prisma.$executeRaw`
    UPDATE member_signal_api_tokens SET active = FALSE, revoked_at = NOW()
    WHERE id = ${id} AND user_id = ${userId} AND active = TRUE
  `;
  return changed === 1;
}

export async function verifyMemberSignalApiToken(token: string): Promise<{
  userId: string;
  tokenId: string;
} | null> {
  if (!prisma || !token.startsWith("mxm_") || token.length < 32 || token.length > 100) return null;
  const rows = await prisma.$queryRawUnsafe<TokenRow[]>(
    `SELECT * FROM member_signal_api_tokens
     WHERE token_hash = $1 AND active = TRUE AND expires_at > NOW()
       AND 'plans:read' = ANY(scopes)
     LIMIT 1`,
    hashToken(token)
  );
  const row = rows[0];
  if (!row) return null;
  const membership = await getMembershipStatus(row.user_id);
  if (!membership.isActive) return null;
  await prisma.$executeRaw`UPDATE member_signal_api_tokens SET last_used_at = NOW() WHERE id = ${row.id}`;
  return { userId: row.user_id, tokenId: row.id };
}
