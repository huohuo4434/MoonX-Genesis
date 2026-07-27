import { Suspense } from "react";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "邮箱登录 | MoonX" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; plan?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main>
      <Section spacing="lg">
        <Suspense fallback={null}>
          <LoginForm next={next ?? "/account"} />
        </Suspense>
      </Section>
    </main>
  );
}
