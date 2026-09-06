// Research-chart calendar only: do not change execution calendars implicitly.
// NYSE: https://www.nyse.com/trade/hours-calendars
// HKEX: ce_SEHK_CT_075_2025.pdf (2026 securities holidays), HK Government P2025051300353.
const US_2026 = new Set(['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25']);
const HK_2026 = new Set(['01-01','02-17','02-18','02-19','04-03','04-06','04-07','05-01','05-25','06-19','07-01','10-01','10-19','12-25']);
// SSE 2026: c_20251222_10802507.shtml. Weekend make-up workdays are NOT sessions.
const CN_2026 = new Set(['01-01','01-02','02-16','02-17','02-18','02-19','02-20','02-23','04-06','05-01','05-04','05-05','06-19','09-25','10-01','10-02','10-05','10-06','10-07']);
// SZSE same 2026 dates: investor.szse.cn/disclosure/notice/general/t20251222_618087.html
export const isChartChinaEquity = (asset: string) => ['cxmt','ganfeng-lithium','lian-tech','lexin-medical'].includes(asset);
export const isChartFutures = (asset: string) => ['gold','silver','wti-crude'].includes(asset);
export const isChartCrypto = (asset: string) => ['btc','eth','sol','hype','asteroid'].includes(asset);
// Orderly's SPCX perp publishes UTC bars, including zero-trade quote bars on weekends.
export const isChartUtcMarket = (asset: string) => isChartCrypto(asset) || asset === 'spcx';
export function chartCalendarSupported(asset: string, date: string) {
  // CME Sep 2026 verified at cmegroup.com/trading-hours.html. Labor Day flows
  // into Sep 8 trade date; do not invent a separate settlement-day candle on Sep 7.
  if (isChartFutures(asset)) return date >= '2026-09-01' && date <= '2026-09-30';
  return isChartUtcMarket(asset) || date.startsWith('2026-');
}
export function isChartTradingDay(asset: string, date: string) {
  if (isChartUtcMarket(asset)) return true;
  if ([0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())) return false;
  if (isChartFutures(asset)) return date !== '2026-09-07';
  // Historical provider bars outside the verified year are retained; future generation
  // separately requires chartCalendarSupported and never assumes a future holiday list.
  if (!date.startsWith('2026-')) return true;
  return !(isChartChinaEquity(asset) ? CN_2026 : asset === 'tencent' ? HK_2026 : US_2026).has(date.slice(5));
}
