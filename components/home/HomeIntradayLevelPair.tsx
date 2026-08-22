// MOOX_V72080_HOME_INTRADAY_LEVEL_PAIR
import { getIntradayTechnicalLevels } from "@/lib/market-data/intraday-chan-levels";


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
  const levels = await getIntradayTechnicalLevels(symbol, direction).catch(() => null);
  const support = levels && levels.source !== "UNAVAILABLE" ? levels.support : "—";
  const resistance = levels && levels.source !== "UNAVAILABLE" ? levels.resistance : "—";
  const title = levels && levels.source !== "UNAVAILABLE" ? levels.sourceLabel : "4H结构行情刷新中";

  if (mode === "inline") {
    return <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/36" title={title}><span>支撑 {support}</span><span>压力 {resistance}</span></div>;
  }
  return <><td className="px-3 py-3 text-sm text-white/74" title={title}>{support}</td><td className="px-3 py-3 text-sm text-white/74" title={title}>{resistance}</td></>;
}
