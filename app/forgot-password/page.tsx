import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    ...buildLocalizedPageMetadata({
      locale,
      basePath: "/forgot-password",
      titleZh: "找回密码",
      titleEn: "Reset your MOOX password",
      descriptionZh: "通过注册邮箱申请一次性密码重设链接。",
      descriptionEn: "Request a one-time password reset link for your MOOX account.",
    }),
    robots: { index: false, follow: false },
  };
}

export default function ForgotPasswordPage() {
  return (
    <main>
      <Section spacing="lg">
        <Suspense fallback={null}>
          <ForgotPasswordForm />
        </Suspense>
      </Section>
    </main>
  );
}
