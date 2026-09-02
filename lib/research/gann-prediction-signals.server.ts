import "server-only";

import { prisma } from "@/lib/prisma";
import { parseExternalAnalystPost } from "@/lib/trading-signals/external-analyst-parser";
import { inferGannTurnIntent, type VerifiedGannSignal } from "@/lib/research/gann-prediction-overlay-core";

type GannRow = { username: string; post_id: string; post_url: string; posted_at: Date | string; text: string };

export async function getVerifiedGannPredictionSignals(now = new Date()): Promise<VerifiedGannSignal[]> {
  if (!prisma) return [];
  try {
    const rows = await prisma.$queryRawUnsafe<GannRow[]>(`
      SELECT username, post_id, post_url, posted_at, text
      FROM trade_external_analyst_posts
      WHERE LOWER(username) = 'btctw0'
        AND posted_at >= $1::timestamptz - INTERVAL '45 days'
        AND posted_at <= $1::timestamptz
      ORDER BY posted_at DESC
      LIMIT 80
    `, now.toISOString());
    return rows.flatMap((row): VerifiedGannSignal[] => {
      const postedDate = row.posted_at instanceof Date ? row.posted_at : new Date(row.posted_at);
      if (Number.isNaN(postedDate.getTime())) return [];
      const postedAt = postedDate.toISOString();
      const parsed = parseExternalAnalystPost({ source: "BTCTW0", username: row.username, postId: row.post_id, postUrl: row.post_url, postedAt, text: row.text });
      if (!parsed.researchEligible || parsed.symbols.length !== 1) return [];
      return [{
        postId: parsed.postId,
        postUrl: parsed.postUrl,
        postedAt: parsed.postedAt,
        symbol: parsed.symbols[0]!,
        direction: parsed.direction,
        turnIntent: inferGannTurnIntent(parsed.text),
        timeWindows: parsed.timeWindows,
        supportLevels: parsed.supportLevels,
        resistanceLevels: parsed.resistanceLevels,
        targetLevels: parsed.targetLevels,
        invalidationLevels: parsed.invalidationLevels,
        summary: parsed.summary,
      }];
    });
  } catch {
    return [];
  }
}
