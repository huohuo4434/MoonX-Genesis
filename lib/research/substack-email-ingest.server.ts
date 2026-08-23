import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureExternalAnalystTables } from "@/lib/trading-signals/external-analyst-signals";
import type { PreparedSubstackEmail } from "@/lib/research/substack-email-core";

export type SubstackEmailIngestReport = {
  acceptedEmails: number;
  storedEmails: number;
  duplicateEmails: number;
  checkedAt: string;
};

export async function ingestPreparedSubstackEmails(
  emails: PreparedSubstackEmail[],
  checkedAt = new Date().toISOString(),
): Promise<SubstackEmailIngestReport> {
  if (!prisma || !(await ensureExternalAnalystTables())) {
    throw new Error("DATABASE_UNAVAILABLE");
  }

  const rows = emails.map((email) => ({
    id: email.id,
    source: email.source,
    username: email.username,
    post_id: email.postId,
    post_url: email.postUrl,
    posted_at: email.postedAt,
    text: email.text,
    parsed: email.parsed,
  }));

  let storedEmails = 0;
  if (rows.length) {
    const inserted = await prisma.$queryRawUnsafe<Array<{ post_id: string }>>(
      `WITH incoming AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb) AS row(
           id TEXT,
           source TEXT,
           username TEXT,
           post_id TEXT,
           post_url TEXT,
           posted_at TEXT,
           text TEXT,
           parsed JSONB
         )
       )
       INSERT INTO trade_external_analyst_posts(
         id, source, username, post_id, post_url, posted_at, text, parsed, fetched_at, created_at, updated_at
       )
       SELECT id, source, username, post_id, post_url, posted_at::timestamptz, text, parsed, NOW(), NOW(), NOW()
       FROM incoming
       ON CONFLICT (source, post_id) DO NOTHING
       RETURNING post_id`,
      JSON.stringify(rows),
    );
    storedEmails = inserted.length;
  }

  const safeCheckedAt = Number.isFinite(Date.parse(checkedAt)) ? new Date(checkedAt).toISOString() : new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO trade_external_analyst_state(state_key, payload, updated_at)
     VALUES ('substack_email_collector', $1::jsonb, NOW())
     ON CONFLICT (state_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    JSON.stringify({
      checkedAt: safeCheckedAt,
      acceptedEmails: emails.length,
      storedEmails,
      duplicateEmails: Math.max(0, emails.length - storedEmails),
      source: "SUBSTACK_CYCLE",
      publicSourceLabel: "周期预测师",
      researchOnly: true,
      directTradingAllowed: false,
    }),
  );

  return {
    acceptedEmails: emails.length,
    storedEmails,
    duplicateEmails: Math.max(0, emails.length - storedEmails),
    checkedAt: safeCheckedAt,
  };
}
