import { analystSourceFromUsername, parseExternalAnalystPost } from "@/lib/trading-signals/external-analyst-parser";
import type { ExternalAnalystParsedPost, ExternalAnalystSource } from "@/types/external-analyst";

export type CollectorPost = { username: string; id: string; text: string; createdAt: string; url?: string };
export type PreparedCollectorPost = CollectorPost & { source: ExternalAnalystSource; parsed: ExternalAnalystParsedPost };

export function prepareExternalAnalystCollectorPosts(input: {
  posts: CollectorPost[];
  allowedAccounts: ReadonlySet<string>;
  generalRegistryAccounts: ReadonlyMap<string, string>;
}): { accepted: PreparedCollectorPost[]; rejected: Array<{ username: string; id: string; reason: string }>; duplicateCount: number; truncatedCount: number } {
  const unique = new Map<string, CollectorPost>();
  const rejected: Array<{ username: string; id: string; reason: string }> = [];
  const bounded = input.posts.slice(0, 120);
  const truncatedCount = Math.max(0, input.posts.length - bounded.length);
  let duplicateCount = 0;
  for (const raw of bounded) {
    const post = {
      username: String(raw.username ?? "").replace(/^@/, "").trim(),
      id: String(raw.id ?? "").trim(),
      text: String(raw.text ?? "").replace(/\u0000/g, "").trim().slice(0, 20_000),
      createdAt: String(raw.createdAt ?? "").trim(),
      url: raw.url ? String(raw.url).trim() : undefined,
    };
    if (!post.username || !post.id || !post.text || !post.createdAt) {
      rejected.push({ username: post.username || "UNKNOWN", id: post.id || "UNKNOWN", reason: "MALFORMED_POST" });
      continue;
    }
    const key = `${post.username.toLowerCase()}:${post.id}`;
    if (unique.has(key)) duplicateCount += 1;
    else unique.set(key, post);
  }
  const accepted: PreparedCollectorPost[] = [];
  for (const post of unique.values()) {
    const normalized = post.username.toLowerCase();
    const dedicatedSource = analystSourceFromUsername(post.username);
    const sourceFamily = input.generalRegistryAccounts.get(normalized);
    const source: ExternalAnalystSource | null = dedicatedSource ?? (sourceFamily ? "GENERAL_X_RESEARCH" : null);
    if (!input.allowedAccounts.has(normalized)) {
      rejected.push({ username: post.username, id: post.id, reason: "ACCOUNT_NOT_ALLOWED" });
      continue;
    }
    if (!source) {
      rejected.push({ username: post.username, id: post.id, reason: "SOURCE_NOT_REGISTERED" });
      continue;
    }
    const postedAt = new Date(post.createdAt);
    if (Number.isNaN(postedAt.getTime())) {
      rejected.push({ username: post.username, id: post.id, reason: "INVALID_POSTED_AT" });
      continue;
    }
    accepted.push({ ...post, source, parsed: parseExternalAnalystPost({ source, sourceFamily, username: post.username, postId: post.id, postUrl: post.url ?? `https://x.com/${post.username}/status/${post.id}`, postedAt: postedAt.toISOString(), text: post.text }) });
  }
  return { accepted, rejected, duplicateCount, truncatedCount };
}
