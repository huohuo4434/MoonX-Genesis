import type { ConvictionPeriodForecast } from '@/lib/data/conviction/asteroid-forecasts';
import { canonicalConvictionForecastHorizon } from '@/lib/forecasts/canonical-forecast-adapter-core';

/** Legacy TSLA storage slots are not their research horizons. Source IDs and dates
 * come from tsla-liuyao-20260816; no published record is rewritten here. */
export function keyDateSourceHorizon(row: ConvictionPeriodForecast): 'MONTH' | 'WEEK' | 'STAGE' | null {
  if (row.assetId === 'tsla' && row.id === 'TSLA-7W-20260817-V1') return 'STAGE';
  const horizon = canonicalConvictionForecastHorizon(row);
  return horizon === 'MONTH' || horizon === 'WEEK' ? horizon : null;
}
