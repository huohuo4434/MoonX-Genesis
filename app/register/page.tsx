import { Suspense } from "react";
import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  getAuthMaintenanceMessage,
  getFeatureFlags,
  isSupabaseAuthConfigured,
} from "@/lib/feature-flags";

export const metadata = { title: "注册" };

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
