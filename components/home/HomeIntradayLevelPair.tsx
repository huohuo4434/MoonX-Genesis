// MOOX_V72080_HOME_INTRADAY_LEVEL_PAIR
import { getIntradayTechnicalLevels, resolveIntradayTechnicalTarget } from "@/lib/market-data/intraday-chan-levels";
import { HomeTechnicalLevelView } from "./HomeTechnicalLevelView";


export async function HomeIntradayLevelPair({
  symbol,
  direction,
  mode = "cells",
}: {
  symbol: string;
  direction?: string | null;
  fallbackSupport?: string | null;
  fallbackResistance?: string | null;
  mode?: "cells" | "inline";
}) {
  const instrument = resolveIntradayTechnicalTarget(symbol);
  const levels = direction?.trim() ? await getIntradayTechnicalLevels(symbol, direction).catch(() => null) : null;
  return <HomeTechnicalLevelView levels={levels} instrument={instrument} mode={mode} />;
}
