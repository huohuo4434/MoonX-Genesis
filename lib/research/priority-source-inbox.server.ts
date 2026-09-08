import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { GANN_REVIEW_POSTED_AT } from "@/lib/research/gann-review-20260908";

export async function getPrioritySourceInbox() {
  await requireAdminOrRedirect("/admin/intelligence");
  if (!prisma) return { available: false, posts: [] };
  try {
    const posts = await prisma.$queryRaw<{ post_id: string; posted_at: Date }[]>`
      SELECT post_id, posted_at FROM trade_external_analyst_posts
      WHERE LOWER(username) = 'btctw0'
        AND posted_at > ${GANN_REVIEW_POSTED_AT}::timestamptz
        AND posted_at <= NOW()
      ORDER BY posted_at DESC LIMIT 20
    `;
    return { available: true, posts };
  } catch {
    return { available: false, posts: [] };
  }
}
