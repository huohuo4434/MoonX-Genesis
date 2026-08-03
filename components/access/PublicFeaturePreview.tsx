"use client";

import Link from "next/link";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function PublicFeaturePreview({
  eyebrow,
  title,
  description,
  solves,
  memberBenefits,
  exampleTitle,
  exampleLines,
  nextPath,
}: {
  eyebrow: string;
  title: string;
  description: string;
  solves: string[];
  memberBenefits: string[];
  exampleTitle: string;
  exampleLines: string[];
  nextPath: string;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-3xl">
        <Badge variant="outline">{eyebrow}</Badge>
        <Heading as="h1" size="h2" className="mt-3 break-keep">{title}</Heading>
        <Text variant="body" color="secondary" className="mt-3 block">{description}</Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="lg">
          <Heading as="h2" size="h3">{en ? "What it solves" : "它解决什么问题"}</Heading>
          <ul className="mt-4 space-y-2 text-body-sm text-foreground-secondary">
            {solves.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </Card>
        <Card padding="lg">
          <Heading as="h2" size="h3">{en ? "What paid members receive" : "付费会员可获得"}</Heading>
          <ul className="mt-4 space-y-2 text-body-sm text-foreground-secondary">
            {memberBenefits.map((item) => <li key={item}>✓ {item}</li>)}
          </ul>
        </Card>
      </div>

      <Card padding="lg" className="border-primary/20 bg-primary/[0.04]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{en ? "Example" : "示例"}</Badge>
          <Heading as="h2" size="h3">{exampleTitle}</Heading>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {exampleLines.map((line) => (
            <div key={line} className="rounded-md border border-border/[0.08] bg-background/40 p-3 text-body-sm text-foreground-secondary">
              {line}
            </div>
          ))}
        </div>
        <Text variant="caption" color="tertiary" className="mt-4 block">
          {en ? "This example explains the page structure only. It is not a current market view, position or trading signal." : "示例仅说明页面结构，不代表当前实时观点、仓位或交易信号。"}
        </Text>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link href={`/login?tab=register&next=${encodeURIComponent(nextPath)}`}>{en ? "Register free" : "免费注册"}</Link></Button>
        <Button asChild variant="outline"><Link href="/pricing">{en ? "View membership and pricing" : "查看会员权益与价格"}</Link></Button>
        <Button asChild variant="ghost"><Link href="/verification">{en ? "View public verification" : "查看公开验证"}</Link></Button>
      </div>
    </div>
  );
}
