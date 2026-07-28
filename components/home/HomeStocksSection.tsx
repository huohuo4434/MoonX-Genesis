import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Badge, Text } from "@/components/ui";
import { listPublishedStocks } from "@/lib/data/stocks-store";

export async function HomeStocksSection() {
  const stocks = (await listPublishedStocks()).slice(0, 3);
  if (!stocks.length) return null;

  return (
    <section className="border-t border-border/[0.06] py-8 lg:py-12">
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="个股" title="已发布个股分析" subtitle="仅展示已完成并正式发布的个股。" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {stocks.map((s) => (
            <Link
              key={s.id}
              href={`/stocks/${s.id}`}
              className="rounded-lg border border-border/[0.08] bg-card p-4 transition-colors hover:border-border/30"
            >
              <div className="flex items-center justify-between gap-2">
                <Text variant="body" weight="semibold">
                  {s.name}
                </Text>
                <Badge variant="outline">{s.directionLabel}</Badge>
              </div>
              <Text variant="caption" color="tertiary" className="mt-1 block font-mono">
                {s.symbol}
              </Text>
              <Text variant="body-sm" color="secondary" className="mt-2 line-clamp-2">
                {s.coreScenario}
              </Text>
            </Link>
          ))}
        </div>
        <Link href="/stocks" className="mt-4 inline-block text-body-sm text-primary underline-offset-4 hover:underline">
          查看全部已发布个股
        </Link>
      </div>
    </section>
  );
}
