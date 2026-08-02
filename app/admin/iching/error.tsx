"use client";

import { useEffect } from "react";
import { Button, Card, Heading, Section, Text } from "@/components/ui";

export default function AdminIChingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-iching] route error", {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">六爻后台暂时无法加载</Heading>
        <Card padding="lg" className="mt-5 border border-red-500/30 bg-red-500/5">
          <Text variant="body-sm" color="secondary">
            系统已记录本次错误。可以先重试；若仍失败，请到“网站诊断”查看数据源和数据库迁移状态。
          </Text>
          {error.digest ? <Text variant="caption" color="tertiary" className="mt-2 block">错误关联码：{error.digest}</Text> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>重新加载</Button>
            <Button asChild variant="secondary"><a href="/admin/site-health">打开网站诊断</a></Button>
          </div>
        </Card>
      </Section>
    </main>
  );
}
