import type { DailyProjectionData } from './daily-candle-projection-core';

type Words = { zh: string; en: string };
export type ReviewZone = { low: number; high: number; label: Words };
type Review = {
  symbol: string; referenceClose: number; zones: ReviewZone[]; summary: Words;
  invalidBelow: number; objective: number;
};
const zone = (low: number, high: number, zh: string, en: string): ReviewZone => ({ low, high, label: { zh, en } });

// Presentation-only, source-locked technical review. Never imported by order or
// projection engines. See docs/tiger-chart-review-20260915.md for original evidence.
export const TECHNICAL_REVIEW = {
  id: 'technical-review-20260915-v1', sourceSession: '2026-09-14',
  availableFrom: '2026-09-15T10:00:00Z', reviewBy: '2026-09-16T18:00:00Z',
  source: '美股定风虎 · 09/14 盘前给支撑，盘中喊止盈！',
} as const;
const reviews: Record<string, Review> = {
  sandisk: { symbol: 'SNDK', referenceClose: 1551.99, invalidBelow: 1498, objective: 1640.95,
    zones: [zone(1498, 1517, '短线回踩观察区', 'Short-term retest zone'),
      zone(1436.15, 1460.19, '下一支撑区', 'Next support zone'),
      zone(1293.70, 1308.95, '深层支撑区', 'Deeper support zone'),
      zone(1640.95, 1651.23, '反弹减仓观察区', 'Rebound trim zone'),
      zone(1839.74, 1839.74, '突破后下一压力', 'Next resistance after breakout')],
    summary: { zh: '1498–1517回踩企稳再观察短线机会；跌破1498则这笔短线反弹逻辑失效，反弹至1640.95–1651.23先观察减仓。只有收盘站上1651.23、回踩守住后，才看1839.74。议息前不把短线仓当长线硬扛。',
      en: 'Watch for stabilization on a 1498–1517 retest. Below 1498 invalidates this short-term rebound setup; 1640.95–1651.23 is a trim-watch zone. Consider 1839.74 only after a close above 1651.23 and a successful retest. Do not turn a failed short-term setup into a long-term hold before the Fed decision.' } },
  lite: { symbol: 'LITE', referenceClose: 835.03, invalidBelow: 800, objective: 974.11,
    zones: [zone(800, 816.42, '回踩观察区', 'Retest watch zone'),
      zone(783.54, 783.54, '失守后下一支撑', 'Next support after breakdown'),
      zone(934.36, 934.36, '中途压力', 'Intermediate resistance'),
      zone(974.11, 1014.13, '反弹目标观察区', 'Rebound objective zone')],
    summary: { zh: '800–816.42为回踩观察区，先等止跌确认，不追高。934.36先看阻力，974.11–1014.13为分批减仓观察区；收盘失守800则箱体反弹假设失效，重新评估783.54。通道下沿另需随实际K线核验。',
      en: 'Watch 800–816.42 for a confirmed stabilization, not a chase. First resistance is 934.36; 974.11–1014.13 is the staged trim-watch zone. A close below 800 invalidates this range-rebound scenario; reassess 783.54. The moving channel boundary requires separate candle-based verification.' } },
  msft: { symbol: 'MSFT', referenceClose: 505.41, invalidBelow: 493.39, objective: 525.76,
    zones: [zone(493.39, 493.39, '第一回踩观察位', 'First retest watch'),
      zone(468.52, 468.52, '下一回踩观察位', 'Next retest watch'),
      zone(440.16, 440.16, '更低结构位', 'Lower structural level'),
      zone(525.76, 525.76, '减仓观察位', 'Trim watch'),
      zone(550.01, 550.01, '前高压力', 'Prior-high resistance')],
    summary: { zh: '当前不把强势上涨当作追高理由；493.39、468.52为回踩观察位，不是自动买点。已有低位仓可在525.76及550.01前高附近观察减仓；跌破493.39先评估缺口回补风险，长线仓按原买入逻辑单独管理。',
      en: 'Strength alone is not a reason to chase. Watch retests of 493.39 and 468.52; neither is an automatic buy. Existing low-cost positions may watch 525.76 and the 550.01 prior high for trimming. Below 493.39 reassess gap-fill risk; manage long-term holdings against their original thesis.' } },
};

export function technicalReviewFor(data: Pick<DailyProjectionData, 'assetId' | 'quoteSymbol' | 'bars' | 'stale' | 'checkedAt' | 'source' | 'timeZone'>, now: number) {
  const review = reviews[data.assetId];
  if (!review || data.quoteSymbol !== review.symbol) return null;
  const reference = data.bars.find(b => b.date === TECHNICAL_REVIEW.sourceSession);
  const checked = Date.parse(data.checkedAt);
  // Match the actual US equity feed, not a similarly named CFD/perpetual or a
  // split-adjusted series with a different price basis. No rescaling old levels.
  const matched = data.source === 'Yahoo Finance' && data.timeZone === 'America/New_York'
    && reference && Number.isFinite(reference.close)
    && Math.abs(reference.close / review.referenceClose - 1) < 0.001;
  const current = Number.isFinite(now) && Number.isFinite(checked) && now >= Date.parse(TECHNICAL_REVIEW.availableFrom)
    && checked <= now + 60_000 && now - checked <= 15 * 60_000;
  const status = !matched ? 'BASIS_MISMATCH' : now >= Date.parse(TECHNICAL_REVIEW.reviewBy) ? 'EXPIRED'
    : !current || data.stale ? 'STALE' : 'ACTIVE';
  const close = data.bars.at(-1)?.close;
  const condition = close === undefined || !Number.isFinite(close) ? 'UNAVAILABLE'
    : close < review.invalidBelow ? 'BELOW_WATCH' : close >= review.objective ? 'AT_OBJECTIVE' : 'WAIT_CONFIRMATION';
  return { ...review, ...TECHNICAL_REVIEW, status, condition,
    // Keep the dated evidence, but withhold live chart lines when expired/stale.
    chartZones: status === 'ACTIVE' ? review.zones : [] };
}
