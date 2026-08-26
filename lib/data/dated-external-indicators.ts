import { DATED_EXTERNAL_INDICATORS_20260823 } from "@/lib/data/external-indicators-20260823";
import { DATED_EXTERNAL_INDICATORS_20260826 } from "@/lib/data/external-indicators-20260826";

export type { DatedExternalIndicator } from "@/lib/data/external-indicators-20260823";

export const DATED_EXTERNAL_INDICATORS = [
  ...DATED_EXTERNAL_INDICATORS_20260823,
  ...DATED_EXTERNAL_INDICATORS_20260826,
] as const;
