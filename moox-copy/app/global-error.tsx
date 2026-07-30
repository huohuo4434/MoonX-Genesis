"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Heading, Text } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-4">
          <Heading as="h1" size="h2">
            页面出现异常
          </Heading>
          <Text variant="body-sm" color="secondary">
            请稍后重试。如持续出现，请联系客服。
          </Text>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => reset()}>
              重试
            </Button>
            <Button asChild variant="outline">
              <Link href="/">返回首页</Link>
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
