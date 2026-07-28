"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Heading, Section, Text } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.name);
  }, [error]);

  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-lg">
        <Heading as="h1" size="h2">
          加载失败
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          当前页面暂时无法完成加载。请重试或返回首页。
        </Text>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>
            重试
          </Button>
          <Button asChild variant="outline">
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
