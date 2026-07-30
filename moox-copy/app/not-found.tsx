import Link from "next/link";
import type { Metadata } from "next";
import { Button, Heading, Section, Text } from "@/components/ui";

export const metadata: Metadata = {
  title: "页面不存在",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <Section spacing="lg" className="mx-auto max-w-lg">
        <Heading as="h1" size="h2">
          404
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-3 block">
          页面不存在，或该内容仅供内部使用。
        </Text>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">返回首页</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/verification">历史准确率</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
