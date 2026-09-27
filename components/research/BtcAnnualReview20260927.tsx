import "server-only";
import Link from "next/link";
import { BTC_ANNUAL_MONTHS, BTC_ANNUAL_REVIEW_VERSION, btcAnnualReviewArchived } from "@/lib/research/btc-annual-review-20260927.server";

/** Member/device-gated, read-only context. Never connected to forecast/order writers. */
export function BtcAnnualReview20260927({ en = false, compact = false, nowMs }: { en?: boolean; compact?: boolean; nowMs: number }) {
  const t = (zh: string, english: string) => en ? english : zh;
  const prefix = en ? "/en" : "";
  return <section id="btc-annual-20260927" data-btc-annual-review={BTC_ANNUAL_REVIEW_VERSION} className="mx-auto my-6 w-full max-w-7xl rounded-2xl border border-sky-300/30 bg-slate-950 p-5 text-slate-100 sm:p-7">
    <p className="text-xs text-sky-200">{t("丙午老师年卦复核 · 2026-09-27 · V1 · 中长期背景", "Bingwu annual-source review · 2026-09-27 · V1 · Long-horizon context")}</p>
    <h2 className="mt-2 text-xl font-semibold">{btcAnnualReviewArchived(nowMs) ? t("历史存档：", "Archived: ") : ""}{t("BTC：9月与2027年1月双高点候选窗口", "BTC: potential high windows in September and January 2027")}</h2>
    <p className="mt-3 text-sm leading-7 text-slate-300">{t("按本次用户指定，以丙午老师2026流年卦作为BTC未来数月的主要年度背景：全年相较2025偏弱，7—8月逐步上行，9月及2027年1月可能出现高点。两个高点没有高低排序；这不是9月后一路下跌或1月必创新高的承诺。", "As requested, Bingwu's 2026 annual reading is the principal yearly context for BTC: weaker than 2025, gradual strength in July–August, and possible highs in September and January 2027. The two highs are not ranked; this promises neither uninterrupted declines after September nor a new record in January.")}</p>
    <p className="mt-3 rounded-lg bg-sky-300/10 p-3 text-sm leading-6">{t("新版阅读顺序：年卦定大背景 → 月／阶段卦细化中间路径 → 周卦与技术结构确认。下方旧版观点保留作历史与分歧对照；本次不覆盖已锁定的日、周、月预测，不向自动交易发送信号。", "Read the annual context first, then monthly/stage evidence, followed by weekly and technical confirmation. Older views below remain for history and dissent. This edition does not overwrite locked daily, weekly or monthly forecasts or send trading signals.")}</p>
    {compact ? <Link prefetch={false} className="mt-4 inline-block text-sky-200 underline" href={`${prefix}/member/monthly#btc-annual-20260927`}>{t("查看9月至跨年逐月解读与ETH参考边界 →", "Read the month-by-month map and ETH limitations →")}</Link> : <>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {BTC_ANNUAL_MONTHS.map(row => <article key={row.month} className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-sky-200">{row.month} · {row.origin === "TEACHER_WINDOW" ? t("老师原文窗口", "Source window") : row.origin === "USER_SCENARIO" ? t("用户条件情景", "User scenario") : t("原文未细分", "Not specified by source")}</p>
          <h3 className="mt-2 font-medium">{en ? row.en : row.zh}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{en ? row.watchEn : row.watchZh}</p>
        </article>)}
      </div>
      <h3 className="mt-5 font-semibold">{t("ETH与其他加密币：参考环境，不复制预测", "ETH and other crypto: shared context, not copied forecasts")}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{t("本份原卦只针对BTC。ETH及其他币可以参考BTC高点窗口附近的整体风险环境，但不能据此认定同日见顶、同幅回撤或同步创新高。各币自己的月／周来源、相对BTC强弱、流动性和技术结构仍需独立核对；没有独立证据的不生成正式方向、价格目标或胜率。", "This reading concerns BTC only. ETH and other assets can use its high windows as broader risk context, but not as proof of simultaneous tops, identical drawdowns or new highs. Asset-specific monthly/weekly evidence, relative strength, liquidity and structure need separate checks; no official direction, target or hit rate is generated without them.")}</p>
      <h3 className="mt-5 font-semibold">{t("原文边界与修订原因", "Source limitations and revision reason")}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{t("来源：《比特幣2026年走勢預測，流年卦解析》，用户提供转录与白板照片；转录自述录制于2026年1月5日，原始上线时间未独立核验。9月27日重新复核并增加逐月阅读说明；9月5日旧修订保留。原文未给10—12月逐月方向或价格目标；曾按节气解释月份，但2026这两个窗口的精确节气边界并未明确，因此不擅自换算为具体交易日。", "Source: the user-supplied transcript and whiteboard photo of Bingwu's 2026 Bitcoin annual reading. The speaker dates the recording Jan 5, 2026; original upload time is not independently verified. This Sep 27 review adds a monthly reading guide and preserves the Sep 5 edition. No Oct–Dec monthly directions or price targets are supplied. Solar-term months are discussed, but exact boundaries for these windows are not specified; no exact trading dates are invented.")}</p>
      <p className="mt-2 text-sm leading-7 text-amber-200">{t("老师本人提到以往低点预测不准。过去高点的准确性是老师自述，本次未做完整行情回测，不把自述“六七成”当统计胜率；3、5、6月的低点候选不改写成未来冬季低点。卦象是所选研究方法，不是经验证的收益保证。窗口、概率、共识与执行权限分开；本版概率／共识未评估，没有交易授权。", "The speaker acknowledges prior low-point misses. Past high-point accuracy is self-reported and has not been fully backtested here; the stated 60–70% is not a measured hit rate. March/May/June low candidates are not rewritten as future winter lows. This is the chosen research method, not an empirically validated return guarantee. Windows, probability, consensus and execution authority stay separate; probability/consensus are unassessed and there is no trading authority.")}</p>
    </>}
  </section>;
}
