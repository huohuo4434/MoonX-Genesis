import type { Metadata } from "next";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { Suspense } from "react";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  getAuthMaintenanceMessage,
  getFeatureFlags,
  isSupabaseAuthConfigured,
} from "@/lib/feature-flags";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: "/register",
    titleZh: "注册",
    titleEn: "Create a MOOX account",
    descriptionZh: "注册MOOX账户。",
    descriptionEn: "Create a MOOX account to access public research and membership options.",
  });
}



export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string }>;
}) {
  const { next, ref } = await searchParams;
  const flags = getFeatureFlags();
  const authConfigured = isSupabaseAuthConfigured();
  const maintenanceMessage = getAuthMaintenanceMessage();

  return (
    <main>
      <Section spacing="lg">
        <Suspense fallback={null}>
          <LoginForm
            next={next ?? "/account"}
            authConfigured={authConfigured}
            maintenanceMessage={maintenanceMessage}
            publicSignupEnabled={flags.publicSignupEnabled}
            initialTab="register"
            initialInviteCode={ref ?? ""}
          />
        </Suspense>
      </Section>
    </main>
  );
}
