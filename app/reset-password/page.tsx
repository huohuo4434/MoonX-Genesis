import type { Metadata } from "next";
import { Section } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    ...buildLocalizedPageMetadata({
      locale,
      basePath: "/reset-password",
      titleZh: "设置新密码",
      titleEn: "Choose a new MOOX password",
      descriptionZh: "使用一次性恢复会话设置新的MOOX账户密码。",
      descriptionEn: "Choose a new MOOX password using a one-time recovery session.",
    }),
    robots: { index: false, follow: false },
  };
}

export default function ResetPasswordPage() {
  return (
    <main>
      <Section spacing="lg">
        <ResetPasswordForm />
      </Section>
    </main>
  );
}
