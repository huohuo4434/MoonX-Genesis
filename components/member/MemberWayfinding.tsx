import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/config";

const quickLinks = [
  ["/member#price-time-chart", "K线与位置", "Candles & levels"],
  ["/member/ai-trading", "AI执行与成绩", "AI execution & results"],
  ["/member/weekly-review", "预测复盘", "Forecast review"],
  ["/member/notes", "易老师随笔", "Yi's notes"],
  ["/member/videos", "会员视频", "Member videos"],
  ["/member/consultations", "会员问卦", "Consultations"],
] as const;

const moreLinks = [
  ["/member/daily?research=1", "今日／明日研究", "Session research"],
  ["/member/weekly-report", "周度研究", "Weekly research"],
  ["/member/sector-resonance?detail=1", "板块研究", "Sector research"],
  ["/member/key-dates?research=1", "关键日研究", "Key-date research"],
  ["/member/monthly", "月度预测", "Monthly outlook"],
  ["/member/annual-outlook", "年度展望", "Annual outlook"],
  ["/member/gann", "江恩研究", "Gann research"],
  ["/member/btc-eth-cycle", "BTC／ETH周期", "BTC / ETH cycles"],
  ["/member/daily-review", "日度复盘", "Daily review"],
  ["/member/updates", "版本公告", "Version updates"],
] as const;

/** Navigation only: no account, forecast or execution state is changed here. */
export function MemberWayfinding({ locale, home = false }: { locale: Locale; home?: boolean }) {
  const en = locale === "en";
  const href = (path: string) => localizeHref(path, locale);
  const linkClass = "flex min-h-11 items-center rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300";
  if (home) return <section data-home-wayfinding className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.04] p-4 sm:p-5">
    <h2 className="font-semibold text-slate-100">{en ? "New here, or looking for an old page?" : "新用户先体验，老会员从这里继续"}</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <Link prefetch={false} className={linkClass} href={href("/free-picks")}>{en ? "Free picks →" : "免费体验：看精选计划 →"}</Link>
      <Link prefetch={false} className={linkClass} href={href("/member")}>{en ? "Member trading desk →" : "会员操作台：长中短线与K线 →"}</Link>
      <Link prefetch={false} className={linkClass} href={href("/member#member-guide")}>{en ? "Find videos, forecasts & older tools →" : "找回原入口：视频、预测、研究 →"}</Link>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-400">{en ? "Navigation has moved. Find the content directory and a short guide at the top of the member desk. Access still depends on your membership." : "入口重新整理了。会员频道顶部可找内容目录和简短说明；访问权限仍按会员权益执行。"}</p>
  </section>;
  return <section id="member-guide" data-member-wayfinding className="mb-6 scroll-mt-6 rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.04] p-4 sm:p-5">
    <h2 className="font-semibold text-cyan-100">{en ? "Member workspace" : "会员工作台"}</h2>
    <nav aria-label={en ? "Member shortcuts" : "会员常用入口"} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{quickLinks.map(([path, zh, english]) => <Link prefetch={false} key={path} href={href(path)} className={linkClass}>{en ? english : zh}</Link>)}</nav>
    <details className="mt-3 rounded-xl border border-white/10 p-3">
      <summary className="cursor-pointer text-sm font-medium text-cyan-100">{en ? "Research archive & quick guide" : "研究栏目与使用说明（展开）"}</summary>
      <nav aria-label={en ? "All other member tools" : "其他会员栏目"} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{moreLinks.map(([path, zh, english]) => <Link prefetch={false} key={path} href={href(path)} className={linkClass}>{en ? english : zh}</Link>)}</nav>
      <ol className="mt-4 list-inside list-decimal space-y-2 text-sm leading-6 text-slate-300">
        <li>{en ? "Choose an asset, then your holding period: position, swing or intraday." : "先选标的，再选准备持有的周期：长线、中线或短线。"}</li>
        <li>{en ? "Read entry conditions, stop, targets and expiry together. Check price levels against the named instrument." : "把参与条件、止损、目标、有效期一起看；点位以计划标明的交易品种为准。"}</li>
        <li>{en ? "A waiting or incomplete plan is not an entry signal. Future candles are scenarios, not actual prices." : "显示等待或点位不全，就不是可用入场信号。未来K线是情景示意，不是真实报价。"}</li>
      </ol>
      <p className="mt-3 text-xs leading-5 text-slate-400">{en ? "This update changes navigation, not your membership term, locked forecast history or trading permissions. Some older pages remain research references; check dates before using them." : "本次只调整入口，不改变会员期限、已锁定预测历史或交易权限。旧页面包含研究参考，请先核对日期。"}</p>
    </details>
  </section>;
}
