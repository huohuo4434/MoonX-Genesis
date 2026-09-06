// Research-chart calendar only: do not change execution calendars implicitly.
// NYSE: https://www.nyse.com/trade/hours-calendars
// HKEX: ce_SEHK_CT_075_2025.pdf (2026 securities holidays), HK Government P2025051300353.
const US_2026 = new Set(['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25']);
const HK_2026 = new Set(['01-01','02-17','02-18','02-19','04-03','04-06','04-07','05-01','05-25','06-19','07-01','10-01','10-19','12-25']);
export const isChartCrypto = (asset: string) => ['btc','eth','sol','hype'].includes(asset);
export function chartCalendarSupported(asset: string, date: string) {
  return isChartCrypto(asset) || (date.startsWith('2026-') && !['gold','silver'].includes(asset));
}
export function isChartTradingDay(asset: string, date: string) {
  if (isChartCrypto(asset)) return true;
  if ([0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())) return false;
  if (['gold','silver'].includes(asset)) return true;
  // Historical provider bars outside the verified year are retained; future generation
  // separately requires chartCalendarSupported and never assumes a future holiday list.
  if (!date.startsWith('2026-')) return true;
  return !(asset === 'tencent' ? HK_2026 : US_2026).has(date.slice(5));
}
