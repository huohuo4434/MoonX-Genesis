import { Suspense } from "react";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  getAuthMaintenanceMessage,
  getFeatureFlags,
  isSupabaseAuthConfigured,
} from "@/lib/feature-flags";

export const metadata = { title: "账户登录／注册 | MOOX" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string; tab?: string }>;
}) {
  const { next, ref, tab } = await searchParams;
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
            initialTab={tab === "register" || ref ? "register" : "login"}
            initialInviteCode={ref ?? ""}
          />
        </Suspense>
      </Section>
    </main>
  );
}
