import Link from "next/link";
import { Button, Heading, Section, Text } from "@/components/ui";

export const metadata = { title: "无权访问 | MoonX" };

export default function ForbiddenPage() {
  return (
    <main>
      <Section spacing="lg" className="flex flex-col items-center text-center">
        <Heading as="h1" size="h2">
          403 · 无权访问
        </Heading>
        <Text variant="body" color="secondary" className="mt-3 max-w-md">
          当前账户没有管理员权限。如需访问管理后台，请联系站点管理员。
        </Text>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">返回首页</Link>
        </Button>
      </Section>
    </main>
  );
}
