import { lt, type LocalizedText } from "@/lib/i18n/config";
import type { ResearchMarket, ResearchRecord } from "@/types/research";

export const GANN_REVIEW_VERSION = "TIME-PRICE-20260908-V1";
export const GANN_REVIEW_SOURCE = "https://x.com/BTCTW0/status/2096898294320656565";
export const GANN_REVIEW_POSTED_AT = "2026-09-07T09:48:06.000Z";
// The structured review did not exist when the video was posted.
export const GANN_REVIEW_RECORDED_AT = "2026-09-08T04:04:00.000Z";
export const GANN_REVIEW_EXPIRES_AT = "2026-09-13T16:00:00.000Z";
const text = (zh: string, en: string) => lt(zh, zh, en);
type ReviewAsset = { symbol: string; assetId: string; market: ResearchMarket; near: LocalizedText; longer: LocalizedText; response: LocalizedText; candidate?: boolean };

// Deliberately no executable numeric levels: source quote/venue/adjustment are not reconciled.
export const gannReviewAssets: ReviewAsset[] = [
  { symbol: "BTC", assetId: "bitcoin", market: "crypto",
    near: text("仍可冲高，但当前上涨已进入防回吐阶段。", "Another push higher is possible, but this rally is entering a giveback-risk phase."),
    longer: text("第四季度再观察较大机会；第二个低点不必低于前低。", "Reassess larger opportunities in Q4; a second low need not undercut the prior low."),
    response: text("冲高停滞或突破失败时提高防守；不把9月10日定为必然最高点。", "Become more defensive on a stalled rally or failed breakout. September 10 is not a guaranteed top.") },
  { symbol: "ETH", assetId: "ethereum", market: "crypto",
    near: text("第一段上涨趋于成熟，短线防回调。", "The first advance is maturing; watch short-term pullback risk."),
    longer: text("回调后仍可能有下一段上涨，不等于长期全面看空。", "A further advance may follow a correction; this is not an outright long-term bearish view."),
    response: text("突破后回踩守住才看延续；失守关键结构且收不回，先保护短线仓。", "Continuation needs a breakout and successful retest. A structural break without a reclaim calls for protecting short-term exposure.") },
  { symbol: "SNDK", assetId: "sandisk", market: "semiconductor",
    near: text("阶段上涨仍可延续，重点看冲高后的承接。", "The stage rally can continue; watch whether gains hold after a push higher."),
    longer: text("9月7日—10月7日的强势窗口不是无条件持有期；较大反弹结束后仍有下跌风险。", "The September 7–October 7 strength window is not an unconditional holding period. A larger rebound can still end in another decline."),
    response: text("回踩企稳再观察参与；压力区受阻、跌破反弹结构时保护利润，不因日期未到而硬扛。", "Watch for a stable retest before participation. Protect gains on rejection or a broken rebound structure; do not hold solely because a date has not arrived.") },
  { symbol: "MU", assetId: "micron", market: "semiconductor",
    near: text("反弹仍有空间，同时防冲高后的回落。", "A rebound can extend, with a pullback risk after strength."),
    longer: text("反弹延续不等于长期趋势已经反转。", "A continuing rebound does not establish a long-term trend reversal."),
    response: text("独立看MU的压力和回踩，不套用闪迪价位，也不指定同一天见顶。", "Use MU's own resistance and retests, not SNDK's levels or an assumed shared top date.") },
  { symbol: "GOLD", assetId: "gold", market: "commodity",
    near: text("两种情景：反弹结束，或回调后再冲一次。", "Two scenarios remain: the rebound has ended, or a pullback precedes another push."),
    longer: text("月内仍可能反复，暂不确认唯一高低点日期。", "Monthly swings remain possible; no single top or bottom date is confirmed."),
    response: text("先看结构能否守住，再区分反弹与转强；双情景不能同时算命中。", "Use structural holds to distinguish a rebound from renewed strength. Opposing scenarios cannot both count as a hit.") },
  { symbol: "SPCX", assetId: "spcx", market: "us-equity",
    near: text("反弹延续有条件，先看突破是否站稳。", "Rebound continuation is conditional on a sustained breakout."),
    longer: text("不能把阶段反弹直接解释为长期单边上涨。", "A stage rebound is not evidence of a one-way long-term advance."),
    response: text("先核准交易场所与报价口径；支撑和突破位尚待复核，暂不作为下单价。", "First reconcile the venue and quote basis. Support and breakout levels still need review and are not order prices.") },
  ...([
    ["HOOD", "robinhood", "首段上涨趋于成熟，第四季度观察回调后的机会。", "The first advance is maturing; watch Q4 for opportunities after a pullback."],
    ["CRCL", "circle", "初段上涨后可能回调，第四季度机会更值得观察。", "An initial advance may be followed by a correction; Q4 merits reassessment."],
    ["MSTR", "microstrategy", "先防首段上涨后回调，再观察下一段。", "Watch for a correction after the first advance before assessing the next leg."],
    ["COIN", "coinbase", "相对落后，可能仍在调整；轮动只是候选情景。", "Relative weakness may reflect an ongoing correction; rotation is only a candidate scenario."],
    ["LITE", "lumentum", "较大结构偏积极，下一段上涨仍要等回调结束。", "The larger structure looks constructive, but another advance needs a completed correction."],
    ["MSFT", "microsoft", "较大结构偏积极，与近端回调可以并存。", "A constructive larger structure can coexist with a near-term correction."],
    ["PLTR", "palantir", "观察回调后续涨条件，不把AI板块看成齐涨。", "Watch conditions for continuation after a pullback; AI stocks need not all rise together."],
  ] as const).map(([symbol, assetId, zh, en]): ReviewAsset => ({ symbol, assetId, market: "us-equity", candidate: true,
    near: text(zh, en), longer: text("研究候选，尚不计为同周期正式共振。", "Research candidate, not confirmed same-horizon alignment."),
    response: text("等待该标的独立方向与技术结构确认，不新增自动交易权限。", "Wait for an asset-specific direction and technical confirmation; no new trading authority.") })),
];

export const gannReviewRecords: ResearchRecord[] = gannReviewAssets.map((asset) => ({
  id: `${GANN_REVIEW_VERSION}-${asset.symbol}`, publishedAt: GANN_REVIEW_RECORDED_AT,
  ingestedAt: GANN_REVIEW_RECORDED_AT, sourcePublishedAt: GANN_REVIEW_POSTED_AT, sourcePublishedAtVerified: true,
  expiresAt: GANN_REVIEW_EXPIRES_AT, forecastStart: "2026-09-08", forecastEnd: "2026-09-13",
  accessLevel: "member", visibility: "internal", assetId: asset.assetId, symbol: asset.symbol,
  assetName: text(asset.symbol, asset.symbol), market: asset.market, framework: "gann", sourceType: "public-analyst",
  internalSourceRef: GANN_REVIEW_SOURCE, sourceProfileId: "gann-btctw0", sourceStatus: "raw_source_saved",
  publicSourceLabel: text("时间价格研究", "Time-price research"), direction: "insufficient-evidence",
  editorialConfidence: 0, consensusEligible: false, verificationEligibility: "provisional",
  horizon: text("本周应对／较大周期分开", "Weekly response / larger cycle separated"),
  title: text(`${asset.symbol} · 时间价格应对`, `${asset.symbol} · Time-price response`), summary: asset.near,
  thesis: [asset.longer], risks: [asset.response], status: "active", excludeFromLongTermConsensus: true,
  tags: ["research-only", "no-direction-score", "no-auto-trade", "source:btctw0", "manual-video-review"],
}));

export function gannReviewState(nowMs: number): "upcoming" | "active" | "archive" {
  if (!Number.isFinite(nowMs)) return "archive";
  if (nowMs < Date.parse(GANN_REVIEW_RECORDED_AT)) return "upcoming";
  return nowMs < Date.parse(GANN_REVIEW_EXPIRES_AT) ? "active" : "archive";
}
