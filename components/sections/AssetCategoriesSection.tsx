import {
  ArrowRightIcon,
  CircleIcon,
  GlobeIcon,
  LayersIcon,
  ShieldIcon,
  TrendingUpIcon,
} from "@/components/icons";
import { Heading, Section, Text } from "@/components/ui";
import { demoAssetCategories } from "@/lib/data/demo-content";
import type { ReactNode } from "react";

const categoryIcons: Record<string, ReactNode> = {
  crypto: <CircleIcon size={18} />,
  "us-stocks": <TrendingUpIcon size={18} />,
  "china-stocks": <GlobeIcon size={18} />,
  commodities: <ShieldIcon size={18} />,
  indexes: <LayersIcon size={18} />,
};

/** Category navigation — visual placeholders for future per-asset-class pages. */
export function AssetCategoriesSection() {
  return (
    <Section id="categories" spacing="lg" className="border-t border-border/[0.06]">
      <div className="mb-10 flex flex-col gap-3">
        <Text variant="label" color="secondary" className="uppercase tracking-wide">
          Browse by Category
        </Text>
        <Heading as="h2" size="h2" className="max-w-2xl">
          Asset Categories
        </Heading>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {demoAssetCategories.map((category) => (
          <a
            key={category.id}
            href="#"
            className="group flex flex-col gap-3 rounded-lg border border-border/[0.08] bg-card p-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow-sm focus-ring"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              {categoryIcons[category.id]}
            </div>
            <Text variant="body" weight="semibold" className="text-foreground">
              {category.name}
            </Text>
            <Text variant="caption" color="tertiary" className="normal-case tracking-normal">
              {category.description}
            </Text>
            <span className="mt-auto flex items-center gap-1 pt-2 text-caption text-foreground-tertiary transition-colors group-hover:text-primary">
              Explore
              <ArrowRightIcon size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        ))}
      </div>
    </Section>
  );
}
