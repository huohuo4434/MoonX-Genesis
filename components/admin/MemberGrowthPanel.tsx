import Link from "next/link";
import type { summarizeMemberGrowth } from "@/lib/analytics/member-growth-core";

export function MemberGrowthPanel({ report }: { report: ReturnType<typeof summarizeMemberGrowth> | null }) {
  if (!report) return <section className="my-5 rounded-xl border border-amber-500/40 p-4" role="status">
    <h2 className="font-semibold">经营看板 · 数据待核对</h2>
    <p className="mt-2 text-sm">用户或付款来源未能完整读取，本次不显示付费人数或转化率，避免把读取失败算成0。请稍后刷新，或核对付款记录。</p>
    <Link className="mt-2 inline-block underline" href="/admin/payments">核对付款记录</Link>
  </section>;
  const pct = (n: number | null) => n === null ? "—（无样本）" : `${n}%`;
  return <section className="my-5 space-y-4 rounded-xl border border-border p-4" aria-labelledby="growth-heading">
    <h2 id="growth-heading" className="text-lg font-semibold">经营看板 · 先留存，再增长</h2>
    <p className="text-sm text-foreground-secondary">更新：{new Date(report.asOf).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）。只统计非管理员、非测试账户；付款与会员有效状态分开。</p>
    <div className="grid gap-3 md:grid-cols-2">{report.windows.map(w => <section key={w.days} className="rounded-lg border border-border p-3">
      <h3 className="font-semibold">近{w.days}天</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <dt>新增注册</dt><dd>{w.registrations}人</dd>
        <dt>这批注册中已核对付费</dt><dd>{w.cohortPaid}人</dd>
        <dt>X来源注册／已核对付费</dt><dd>{w.xRegistrations} / {w.xPaid}人</dd>
        <dt>X注册后付费占比</dt><dd>{pct(w.xPaidPercent)}</dd>
        <dt>来源追踪覆盖</dt><dd>{w.tracked} / {w.registrations}人</dd>
        <dt>期间确认付款</dt><dd>{w.confirmedOrders}笔</dd>
        <dt>首次已记录购买</dt><dd>{w.firstObservedBuyers}人</dd>
        <dt>已记录重复购买</dt><dd>{w.repeatBuyers}人</dd>
      </dl>
    </section>)}</div>
    <p className="text-sm">当前有效且有付款证据：{report.activeWithPayment}人；当前有效但付款证据待核对：{report.activeWithoutPayment}人；付款记录异常待核对：{report.unresolved}组。</p>
    <p className="text-sm text-foreground-secondary">以上是已有记录可核对的结果，不是完整历史或因果归因。退款、测试及无有效付款时间的记录不计入；同网络同交易去重。重复购买不等于续费率；首次已记录不保证是用户历史首购。未追踪来源不倒推为X。</p>
    <div className="grid gap-4 md:grid-cols-2">{[
      { title: "未来7天到期 · 有付款记录", rows: report.expiring },
      { title: "近30天已到期 · 有付款记录", rows: report.lapsed },
    ].map(group => <section key={group.title}><h3 className="font-semibold">{group.title}（{group.rows.length}人）</h3>
      <ul className="mt-2 space-y-2 text-sm">{group.rows.slice(0, 30).map(u => <li key={u.id}>
        <Link className="break-all underline" href={`/admin/users?q=${encodeURIComponent(u.email)}`}>{u.email}</Link>
        <span className="ml-2">{new Date(u.expiresAt!).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}到期</span>
      </li>)}</ul>{!group.rows.length ? <p className="mt-2 text-sm text-foreground-secondary">当前没有符合条件的账户。</p> : null}
      {group.rows.length > 30 ? <p className="text-sm">仅显示前30人，请在用户列表核对其余账户。</p> : null}
    </section>)}</div>
    <details className="text-sm"><summary className="cursor-pointer py-2">本周行动与尚缺的数据</summary>
      <ul className="list-disc space-y-2 pl-5"><li>优先了解即将到期、已到期用户：实际使用哪一页，哪里有帮助，哪里看不懂。</li>
        <li>先把反复出现的三个问题修好，再考虑试用活动；不自动发消息、不改会员权益。</li>
        <li>续费率暂不计算：需要按历史应到期批次核对续费，不能用当前会员状态反推。</li>
        <li>访问→注册、注册后再次使用：目前缺少完整事件数据，不显示虚构漏斗。</li>
      </ul>
    </details>
  </section>;
}
