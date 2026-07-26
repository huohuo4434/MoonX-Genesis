import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { TrendBadge } from "@/components/data";
import { Badge, Heading, Section, Text } from "@/components/ui";
import {
  getDominantDirection,
  getSnapshotMetadata,
  listAssetIntelligenceSnapshots,
} from "@/lib/data/intelligence-snapshot";
import { formatDate } from "@/lib/utils";

const homepageAssetIds = ["bitcoin", "nasdaq-100", "semiconductors-storage", "gold"];

/**
 * Compact homepage teaser for the curated MoonX Intelligence Snapshot.
 * Links out to the full report — does not duplicate its content.
 */
export async function TodaysMoonXViewSection() {
  const [allAssets, snapshot] = await Promise.all([listAssetIntelligenceSnapshots(), getSnapshotMetadata()]);
  const assets = homepageAssetIds
    .map((id) => allAssets.find((asset) => asset.id === id))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));

  return (
    <Section id="moonx-view" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-10 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="label" color="secondary" className="uppercase tracking-wide">
            Today&rsquo;s MoonX View
          </Text>
          <Badge variant="warning">{snapshot.statusLabel}</Badge>
          <Badge variant="outline">Curated data — not live</Badge>
        </div>
        <Heading as="h2" size="h2" className="max-w-2xl">
          The latest MoonX Intelligence Snapshot
        </Heading>
        <Text variant="body" color="secondary" className="max-w-2xl">
          Curated {formatDate(snapshot.snapshotDate)} from MoonX Oracle records and internal
          frameworks — a research synthesis, not financial advice.
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <Link
            key={asset.id}
            href={`/research/intelligence-snapshot#${asset.id}`}
            className="group flex flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow-sm focus-ring"
          >
            <div className="flex items-start justify-between gap-2">
              <Text variant="body" weight="semibold" className="text-foreground">
                {asset.asset}
              </Text>
              <TrendBadge trend={getDominantDirection(asset.scores)} />
            </div>
            <Text variant="body-sm" color="secondary">
              {asset.shortView}
            </Text>
            <span className="mt-auto flex items-center gap-1 pt-2 text-caption text-foreground-tertiary transition-colors group-hover:text-primary">
              View Details
              <ArrowRightIcon size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/research/intelligence-snapshot"
        className="mt-8 inline-flex items-center gap-1.5 rounded-sm text-body-sm text-foreground-secondary transition-colors hover:text-primary focus-ring"
      >
        View the full Intelligence Snapshot
        <ArrowRightIcon size={14} />
      </Link>
    </Section>
  );
}
