import type { MemberWealthChainPack, MemberWealthChainView, WealthChainEpisode, WealthChainMemberEpisode } from "@/types/member-wealth-chain";

const SHA256 = /^[A-F0-9]{64}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function validateWealthChainArchive(pack: MemberWealthChainPack): MemberWealthChainPack {
  const ids = new Set<string>();
  const hashes = new Set<string>();
  for (const episode of pack.episodes) {
    if (!VIDEO_ID.test(episode.sourceVideoId)) throw new Error(`INVALID_WEALTH_CHAIN_VIDEO_ID:${episode.id}`);
    if (!SHA256.test(episode.sourceContentSha256)) throw new Error(`INVALID_WEALTH_CHAIN_HASH:${episode.id}`);
    if (ids.has(episode.sourceVideoId)) throw new Error(`DUPLICATE_WEALTH_CHAIN_VIDEO:${episode.sourceVideoId}`);
    if (hashes.has(episode.sourceContentSha256)) throw new Error(`DUPLICATE_WEALTH_CHAIN_CONTENT:${episode.id}`);
    if (episode.sourcePublishedAt !== null) throw new Error(`UNVERIFIED_PUBLISHED_AT:${episode.id}`);
    ids.add(episode.sourceVideoId);
    hashes.add(episode.sourceContentSha256);
  }
  if (pack.episodeCount !== pack.episodes.length) throw new Error("WEALTH_CHAIN_COUNT_MISMATCH");
  if (pack.executionAuthority !== "RESEARCH_ONLY" || pack.consensusEligible || pack.tradingEligible) {
    throw new Error("WEALTH_CHAIN_AUTHORITY_VIOLATION");
  }
  return structuredClone(pack);
}

export function projectWealthChainForMember(pack: MemberWealthChainPack): MemberWealthChainView {
  const validated = validateWealthChainArchive(pack);
  return {
    ...validated,
    episodes: validated.episodes.map((episode) => {
      const publicEpisode = structuredClone(episode) as Partial<WealthChainEpisode>;
      delete publicEpisode.sourceVideoId;
      delete publicEpisode.sourceContentSha256;
      delete publicEpisode.sourceTranscriptFile;
      return publicEpisode as WealthChainMemberEpisode;
    }),
  };
}
