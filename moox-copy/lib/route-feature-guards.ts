import "server-only";

import { notFound, redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/feature-flags";

export function guardPaymentsRoute(): void {
  if (!getFeatureFlags().paymentsEnabled) notFound();
}

export function guardMemberForecastRoute(): void {
  if (!getFeatureFlags().memberForecastEnabled) notFound();
}

export function guardIntelligenceSnapshotRoute(): void {
  if (!getFeatureFlags().intelligenceSnapshotEnabled) redirect("/research");
}

export function guardAccountRoute(): void {
  if (!getFeatureFlags().publicSignupEnabled) notFound();
}
