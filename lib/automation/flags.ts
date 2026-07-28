import "server-only";

import { getFeatureFlags } from "@/lib/feature-flags";
import { getAutomationSettings } from "@/lib/data/moonx-data-store";

/** Effective automation switches: env defaults AND admin storage overrides. */
export async function getEffectiveAutomationFlags() {
  const env = getFeatureFlags();
  const stored = await getAutomationSettings();
  return {
    autoForecastEnabled: stored.autoForecastEnabled && env.autoForecastEnabled,
    autoPublishEnabled: stored.autoPublishEnabled && env.autoPublishEnabled,
    autoVerifyEnabled: stored.autoVerifyEnabled && env.autoVerifyEnabled,
    autoReviewEnabled: stored.autoReviewEnabled && env.autoReviewEnabled,
    autoLearningEnabled: stored.autoLearningEnabled && env.autoLearningEnabled,
  };
}
