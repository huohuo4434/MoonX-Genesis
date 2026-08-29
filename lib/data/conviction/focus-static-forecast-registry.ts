import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { listASharePeriodForecasts20260810, isAShareResearchAssetId } from "@/lib/data/conviction/a-share-liuyao-20260810";
import { listAsteroidPeriodForecasts } from "@/lib/data/conviction/asteroid-forecasts";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";
import { listGooglePeriodForecasts } from "@/lib/data/conviction/google-forecasts";
import { listHypePeriodForecasts20260809, listSolPeriodForecasts20260809 } from "@/lib/data/conviction/hype-sol-20260809";
import { listLongxinPeriodForecasts } from "@/lib/data/conviction/longxin-forecasts";
import { listMsftPeriodForecasts } from "@/lib/data/conviction/msft-forecasts";
import { listMuHypePeriodForecasts } from "@/lib/data/conviction/mu-hype-forecasts";
import { listNbisPeriodForecasts } from "@/lib/data/conviction/nbis-liuyao-20260811";
import { listSandiskPeriodForecasts } from "@/lib/data/conviction/sandisk-forecasts";
import { listTencentPeriodForecasts } from "@/lib/data/conviction/tencent-forecasts";
import { listVibeFocusPeriodForecasts } from "@/lib/data/conviction/vibe-focus-forecasts";
import { listTSLAPeriodForecasts20260816 } from "@/lib/data/conviction/tsla-liuyao-20260816";
import { listLITEPeriodForecasts20260816 } from "@/lib/data/conviction/lite-liuyao-20260816";
import { listSpcxPeriodForecasts } from "@/lib/data/conviction/spcx-forecasts";
import { listIntelPeriodForecasts } from "@/lib/data/conviction/intel-liuyao-20260822";
import type { StaticFocusAssetId } from "@/lib/data/conviction/focus-registry-core";
import { listCryptoSeptemberForecastRevisions20260823 } from "@/lib/data/conviction/crypto-september-revisions-20260823";
import { listSpcxLiteLiuyaoRevisions20260823 } from "@/lib/data/conviction/spcx-lite-liuyao-20260823";
import { listSeptemberWeeklyRevisions20260824 } from "@/lib/data/conviction/september-weekly-revisions-20260824";
import { listMetalsEnergyFocusForecasts } from "@/lib/data/conviction/metals-energy-focus-forecasts";
import { listPriorityAssetCycleCompletions20260825 } from "@/lib/data/conviction/priority-asset-cycle-completions-20260825";
import { listMonthlyLiuyaoForecasts20260829 } from "@/lib/data/conviction/us-megacap-liuyao-20260829";

export function listStaticFocusForecasts(assetId: StaticFocusAssetId): ConvictionPeriodForecast[] {
  if (isAShareResearchAssetId(assetId)) return listASharePeriodForecasts20260810(assetId);
  switch (assetId) {
    case "cxmt": return [...listLongxinPeriodForecasts(), ...listSeptemberWeeklyRevisions20260824("cxmt")];
    case "asteroid": return [...listAsteroidPeriodForecasts(), ...listSeptemberWeeklyRevisions20260824("asteroid")];
    case "sandisk": return [...listSandiskPeriodForecasts(), ...listMonthlyLiuyaoForecasts20260829("sandisk")];
    case "nbis": return listNbisPeriodForecasts();
    case "hype": return [...listHypePeriodForecasts20260809(), ...listCryptoSeptemberForecastRevisions20260823("hype")];
    case "sol": return listSolPeriodForecasts20260809();
    case "eth": return [...listEthPeriodForecasts(), ...listCryptoSeptemberForecastRevisions20260823("eth")];
    case "btc": return [...listBtcPeriodForecasts20260801(), ...listCryptoSeptemberForecastRevisions20260823("btc")];
    case "googl": return [...listGooglePeriodForecasts(), ...listSeptemberWeeklyRevisions20260824("googl")];
    case "msft": return [...listMsftPeriodForecasts(), ...listPriorityAssetCycleCompletions20260825("msft")];
    case "tencent": return [...listTencentPeriodForecasts(), ...listPriorityAssetCycleCompletions20260825("tencent")];
    case "kingsoft-office": return listVibeFocusPeriodForecasts(assetId);
    case "mu": return [...listMuHypePeriodForecasts(assetId), ...listPriorityAssetCycleCompletions20260825("mu")];
    case "tsla": return listTSLAPeriodForecasts20260816();
    case "lite": return [...listLITEPeriodForecasts20260816(), ...listSpcxLiteLiuyaoRevisions20260823("lite")];
    case "spcx": return [...listSpcxPeriodForecasts(), ...listSpcxLiteLiuyaoRevisions20260823("spcx")];
    case "intel": return [...listIntelPeriodForecasts(), ...listSeptemberWeeklyRevisions20260824("intel")];
    case "gold": return listMetalsEnergyFocusForecasts("gold");
    case "silver": return listMetalsEnergyFocusForecasts("silver");
    case "wti-crude": return listMetalsEnergyFocusForecasts("wti-crude");
    default: return [];
  }
}

/**
 * Member surfaces must not each invent their own "latest" rule.  Revisions are
 * immutable siblings of the original forecast, so the current view selects the
 * highest version for each forecast type while the full registry keeps every
 * historical record available for audit.
 */
export function listLatestStaticFocusForecastsByType(
  assetId: StaticFocusAssetId,
): ConvictionPeriodForecast[] {
  const latest = new Map<ConvictionPeriodForecast["forecastType"], ConvictionPeriodForecast>();
  for (const row of listStaticFocusForecasts(assetId).filter((item) => item.status === "published")) {
    const current = latest.get(row.forecastType);
    if (
      !current ||
      row.version > current.version ||
      (row.version === current.version && row.publishedAt > current.publishedAt) ||
      (row.version === current.version && row.publishedAt === current.publishedAt && row.id > current.id)
    ) {
      latest.set(row.forecastType, row);
    }
  }
  return [...latest.values()];
}
