import "server-only";

import type { MemberMarketBranchOutlook } from "@/types/member-market-branch";

const zhEn = (zh: string, en: string) => ({ zh, en });

/**
 * Member-only rolling research captured before the named observation windows.
 * It supplements, and never rewrites, the immutable weekly forecast editions.
 */
export function getMemberMarketBranchOutlook20260813(): MemberMarketBranchOutlook {
  return {
    id: "MEMBER-BRANCH-OUTLOOK-20260813-V1",
    asOf: "2026-08-13T06:30:00+08:00",
    title: zhEn("滚动分支行情 · 8月14—20日", "Rolling Branch Outlook · Aug 14–20"),
    subtitle: zhEn(
      "把周/月玄学方向与最新价格路径分开：方向不追着日K改，技术只判断目前走到哪条分支、是否出现可执行位置。",
      "Weekly/monthly metaphysical direction stays separate from the latest price path. Technical evidence selects the active branch and execution location; it does not rewrite direction."
    ),
    integrityNote: zhEn(
      "这是2026-08-13形成的滚动研究，不覆盖任何已锁定预测。Google本周原预测仍按原文独立验证，不能用本更新事后改成命中。",
      "This rolling note was formed on Aug 13, 2026 and does not overwrite any locked forecast. Google's original weekly call remains independently verifiable and cannot be retrofitted as a hit."
    ),
    timingRule: zhEn(
      "日期是观察窗，不是无脑下单点。只有下杀后收回、低点抬高、假跌破收回或突破回踩成立，才把观察窗升级为买点。",
      "Dates are observation windows, not automatic entries. Upgrade a window to an entry only after a reclaim, rising low, false-break recovery, or confirmed breakout/retest."
    ),
    assets: [
      {
        id: "branch-googl-20260813",
        assetName: zhEn("谷歌A", "Alphabet Class A"),
        symbol: "GOOGL",
        venue: zhEn("纳斯达克", "Nasdaq"),
        stance: "BULLISH_AFTER_CONFIRMATION",
        stanceLabel: zhEn("后半月仍偏多，先等底部确认", "Constructive for late August after bottom confirmation"),
        basePath: zhEn(
          "本周继续释放压力 → 8/17—23形成低点并修复 → 8/24—30在底部成立后震荡向上。不是从当前价位直接一路上涨。",
          "Pressure release this week → a low and repair during Aug 17–23 → a choppy advance during Aug 24–30 if the base is confirmed. This is not a straight rally from the current level."
        ),
        decisionRule: zhEn(
          "优先等315—325区域出现再下探后收回；重新站回340并突破342—350，才逐步确认探底回升。",
          "Prefer a probe and reclaim in the 315–325 area. Reclaiming 340 and then breaking 342–350 progressively confirms the dip-and-recovery branch."
        ),
        invalidation: zhEn(
          "有效跌破315且连续收不回来，月末上涨分支降级；这不改写已经锁定的原预测，只改变后续执行判断。",
          "A decisive break below 315 without a reclaim downgrades the late-month bullish branch. It changes forward execution, not the archived call."
        ),
        levels: [
          zhEn("315—325：核心承接与假跌破观察区", "315–325: primary demand and false-break watch zone"),
          zhEn("340：第一道收回确认", "340: first reclaim confirmation"),
          zhEn("342—350：恢复强势确认区", "342–350: renewed-strength confirmation zone"),
        ],
        nodes: [
          { dateRange: "2026-08-13—2026-08-14", state: "WATCH", label: zhEn("继续找底/止跌", "Search for a low"), condition: zhEn("不抢第一根阳线，观察315—325是否出现承接。", "Do not chase the first green candle; judge demand at 315–325.") },
          { dateRange: "2026-08-17—2026-08-23", state: "CONFIRM", label: zhEn("核心反转观察窗", "Primary reversal watch"), condition: zhEn("再下探后不创新低、假跌破收回或日线反转，才明显转多。", "Turn materially constructive only after a higher low, false-break reclaim, or daily reversal.") },
          { dateRange: "2026-08-24—2026-08-30", state: "CONFIRM", label: zhEn("月末修复分支", "Late-month repair branch"), condition: zhEn("仅在前一周底部成立后，保留震荡上涨路径。", "Keep the choppy-advance path only if the prior week confirms a base.") },
        ],
      },
      {
        id: "branch-spx-20260813",
        assetName: zhEn("标普500", "S&P 500"),
        symbol: "SPX",
        venue: zhEn("美国指数", "US index"),
        stance: "WAIT_FOR_PULLBACK",
        stanceLabel: zhEn("反弹尾段，等待18—19日低点确认", "Late rebound; wait for an Aug 18–19 low confirmation"),
        basePath: zhEn("8/13—14反抽或冲高 → 8/17—18重新回落 → 8/19寻找低点与反转。", "Aug 13–14 rebound/high → Aug 17–18 pullback → search for a low and reversal around Aug 19."),
        decisionRule: zhEn("19日不是开盘即买；更优结构是先跌、事件后再砸、随后快速收回。", "Aug 19 is not an open-at-market entry. A stronger setup is a drop, event-driven flush, and fast reclaim."),
        invalidation: zhEn("若14日前后不冲高而直接破位，或19日前后没有下杀/收回结构，则不为日期硬做交易。", "If price breaks directly without a late-week high, or no flush/reclaim appears around Aug 19, do not force a date-based trade."),
        levels: [zhEn("事件窗：8/14零售销售", "Event window: Aug 14 retail sales"), zhEn("确认窗：8/19 FOMC会议纪要", "Confirmation window: Aug 19 FOMC minutes")],
        nodes: [
          { dateRange: "2026-08-13—2026-08-14", state: "RISK", label: zhEn("反弹尾段/变盘", "Late rebound / pivot risk"), condition: zhEn("允许继续摸高，但不当成新主升。", "Allow another high without treating it as a new primary uptrend.") },
          { dateRange: "2026-08-17—2026-08-18", state: "WATCH", label: zhEn("重新下压", "Renewed pressure"), condition: zhEn("等待恐慌释放，不提前猜最低点。", "Wait for risk release rather than guessing the exact low.") },
          { dateRange: "2026-08-19", state: "CONFIRM", label: zhEn("核心确认日", "Primary confirmation day"), condition: zhEn("下杀后快速收回才提高买点质量。", "A fast reclaim after a flush improves entry quality.") },
        ],
      },
      {
        id: "branch-qqq-20260813",
        assetName: zhEn("纳指100 ETF", "Nasdaq-100 ETF"),
        symbol: "QQQ",
        venue: zhEn("纳斯达克", "Nasdaq"),
        stance: "WAIT_FOR_PULLBACK",
        stanceLabel: zhEn("不追科技反抽，等19日前后回撤", "Do not chase the tech rebound; wait for a pullback near Aug 19"),
        basePath: zhEn("科技股猛烈修复 → 反弹看似转强 → 下周一二重新承压 → 19日前后寻找恐慌释放。", "A sharp tech repair can look like renewed strength before pressure returns early next week and risk releases near Aug 19."),
        decisionRule: zhEn("在SPX/QQQ/BTC三者里，若19日前后出现下杀收回，QQQ是重点观察的弹性标的。", "Among SPX, QQQ and BTC, QQQ is the key high-beta watch if a flush-and-reclaim appears near Aug 19."),
        invalidation: zhEn("若没有回撤而直接持续走强，则宁可错过，不在反弹末端追价。", "If no pullback occurs and strength simply extends, prefer missing the move to chasing the late rebound."),
        levels: [zhEn("8/13—14：反弹充分度", "Aug 13–14: rebound maturity"), zhEn("8/18—19：恐慌释放与收回", "Aug 18–19: flush and reclaim")],
        nodes: [
          { dateRange: "2026-08-13—2026-08-14", state: "RISK", label: zhEn("不追反抽", "Do not chase"), condition: zhEn("观察反弹是否进入衰竭和高位分歧。", "Watch for exhaustion and high-level disagreement.") },
          { dateRange: "2026-08-17—2026-08-19", state: "CONFIRM", label: zhEn("弹性买点观察", "High-beta entry watch"), condition: zhEn("必须看到下杀后的止跌/收回，而不是只因为日期到了。", "Require stabilization/reclaim after a selloff; the date alone is insufficient.") },
        ],
      },
      {
        id: "branch-btc-20260813",
        assetName: zhEn("比特币", "Bitcoin"),
        symbol: "BTC",
        venue: zhEn("7×24小时市场", "24/7 market"),
        stance: "WAIT_FOR_PULLBACK",
        stanceLabel: zhEn("先涨后跌后半段可能提前，低吸窗或早于美股", "The second leg may start early; its entry window may precede US equities"),
        basePath: zhEn("现在至周五仍可能反抽 → 周末至17/18日再向下找低点 → 18—19日进入低吸确认窗。", "A rebound remains possible into Friday → another low search over the weekend into Aug 17/18 → confirmation window during Aug 18–19."),
        decisionRule: zhEn("BTC按7×24小时独立计算，不能跳过周末；假突破跌回后，只有重新收回关键结构才确认。", "BTC is evaluated on its own 24/7 clock, including the weekend. After a failed breakout, only a structural reclaim confirms the next branch."),
        invalidation: zhEn("若周末持续破位且没有收回，不因18/19日到来就强行低吸。", "If the weekend produces a sustained breakdown without a reclaim, do not force a dip buy merely because Aug 18/19 arrives."),
        levels: [zhEn("8/15—16：周末提前走弱风险", "Aug 15–16: early weekend weakness risk"), zhEn("8/18—19：低点/收回观察窗", "Aug 18–19: low/reclaim watch")],
        nodes: [
          { dateRange: "2026-08-13—2026-08-14", state: "WATCH", label: zhEn("允许反抽", "Rebound remains possible"), condition: zhEn("反抽不等于反转，继续防快速转弱。", "A rebound is not a reversal; guard against a fast fade.") },
          { dateRange: "2026-08-15—2026-08-17", state: "RISK", label: zhEn("可能提前下压", "Pressure may arrive early"), condition: zhEn("周末是正式路径，不从验证中跳过。", "The weekend is part of the formal path and is not skipped.") },
          { dateRange: "2026-08-18—2026-08-19", state: "CONFIRM", label: zhEn("低吸确认窗", "Dip-entry confirmation"), condition: zhEn("等待止跌、假跌破收回或低点抬高。", "Wait for stabilization, false-break reclaim, or a higher low.") },
        ],
      },
      {
        id: "branch-asteroid-20260813",
        assetName: zhEn("太空狗", "ASTEROID"),
        symbol: "ASTEROID",
        venue: zhEn("链上小市值代币", "On-chain micro-cap token"),
        stance: "HOLD_WITH_LEVELS",
        stanceLabel: zhEn("成本区偏持有，等待底部与放量突破", "Hold near cost while waiting for a base and volume breakout"),
        basePath: zhEn("2000万—3000万美元市值筑底 → 站稳2700万/3000万 → 突破3400万/3500万才明显转强。", "Build a base in the $20m–$30m market-cap area → hold $27m/$30m → turn materially stronger only above $34m/$35m."),
        decisionRule: zhEn("约2550万美元成本附近不因震荡乱卖；3400万—3500万是第一道真正减仓/确认关，3900万—4500万进入重要兑现区。", "Avoid panic selling near an approximate $25.5m cost basis. $34m–$35m is the first meaningful confirmation/reduction gate; $39m–$45m is a major realization zone."),
        invalidation: zhEn("2000万美元市值有效跌破且反抽收不回来，筑底逻辑需要重新评估。小市值链上币存在极高流动性和项目风险。", "A decisive break below $20m market cap without a reclaim invalidates the current base thesis. Micro-cap on-chain tokens carry extreme liquidity and project risk."),
        levels: [
          zhEn("2000万：底部逻辑失效线", "$20m: base-thesis invalidation"),
          zhEn("2700万—3000万：第一道站稳关", "$27m–$30m: first hold gate"),
          zhEn("3400万—3500万：明显转强/首次减仓区", "$34m–$35m: material strength / first reduction zone"),
          zhEn("3900万—4500万：重要兑现区", "$39m–$45m: major realization zone"),
        ],
        nodes: [
          { dateRange: "2026-08", state: "WATCH", label: zhEn("继续筑底", "Continue base building"), condition: zhEn("日线底分型、一笔上、回踩不破前低后再突破，才提高9月行情可信度。", "A daily bottom fractal, first up-leg, higher-low retest and renewed breakout improve the September case.") },
          { dateRange: "2026-09", state: "CONFIRM", label: zhEn("条件式强势分支", "Conditional strength branch"), condition: zhEn("不是月份必涨；必须先拿下3400万—3500万美元市值。", "September is not automatically bullish; market cap must first clear $34m–$35m.") },
        ],
      },
    ],
  };
}
