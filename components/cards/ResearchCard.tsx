import { Badge, Card, Text } from "@/components/ui";
import type { DemoResearchArticle } from "@/lib/data/demo-content";

export interface ResearchCardProps {
  article: DemoResearchArticle;
}

export function ResearchCard({ article }: ResearchCardProps) {
  return (
    <Card hover padding="lg" className="flex h-full flex-col gap-4">
      <Badge variant="info" className="self-start">
        {article.category}
      </Badge>
      <Text variant="body" weight="semibold" className="text-foreground">
        {article.title}
      </Text>
      <Text variant="body-sm" color="secondary" className="flex-1">
        {article.summary}
      </Text>
      <Text variant="caption" color="tertiary">
        {article.readingTimeMinutes} min read
      </Text>
    </Card>
  );
}
