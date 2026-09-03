import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMembershipActions } from "@/components/admin/AdminUserMembershipActions";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { isActiveMember, isAdmin, listAllAuthUsers, PLAN_LABELS } from "@/lib/auth/permissions";
import { isSandboxUser } from "@/lib/admin/sandbox-data";
import { summarizeSignupAttribution } from "@/lib/analytics/signup-attribution-core";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; sandbox?: string }> }) {
  const { q, sandbox } = await searchParams;
  const all = await listAllAuthUsers();
  const showSandbox = sandbox === "1";
  const production = all.filter((user) => !isSandboxUser(user));
  const sandboxUsers = all.filter(isSandboxUser);
  const attributionUsers = production.filter((user) => !isAdmin(user)).map((user) => ({
    createdAt: user.created_at,
    activeMember: isActiveMember(user),
    firstTouch: user.app_metadata.acquisition_first_touch,
    lastTouch: user.app_metadata.acquisition_last_touch,
  }));
  const attribution7d = summarizeSignupAttribution(attributionUsers, 7);
  const attribution30d = summarizeSignupAttribution(attributionUsers, 30);
  const base = showSandbox ? sandboxUsers : production;
  const users = q?.trim() ? base.filter((u) => u.email.includes(q.trim().toLowerCase())) : base;
  return <main><Section spacing="lg"><AdminNav current="/admin/users" /><Heading as="h1" size="h2">用户与会员</Heading>
    {!showSandbox ? <Card padding="md" className="mt-4"><Heading as="h2" size="h3">注册来源转化</Heading><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Text variant="body-sm" weight="semibold">近 7 天</Text><Text variant="caption" color="tertiary" className="mt-1 block">注册 {attribution7d.registrations} · X 来源 {attribution7d.xRegistrations} · X 当前有效会员 {attribution7d.xActiveMembers} · 当前转化 {attribution7d.xConversionPercent === null ? "—" : `${attribution7d.xConversionPercent}%`}</Text></div><div><Text variant="body-sm" weight="semibold">近 30 天</Text><Text variant="caption" color="tertiary" className="mt-1 block">注册 {attribution30d.registrations} · X 来源 {attribution30d.xRegistrations} · X 当前有效会员 {attribution30d.xActiveMembers} · 当前转化 {attribution30d.xConversionPercent === null ? "—" : `${attribution30d.xConversionPercent}%`}</Text></div></div><Text variant="caption" color="tertiary" className="mt-3 block">来源追踪从本版本上线后开始；未带活动参数或首次访问早于本版本的用户不会被倒推归因。已追踪：7天 {attribution7d.trackedRegistrations}/{attribution7d.registrations}，30天 {attribution30d.trackedRegistrations}/{attribution30d.registrations}。</Text></Card> : null}
    <div className="mt-4 flex flex-wrap gap-2"><Link className={`flex min-h-11 items-center rounded-md border px-4 text-body-sm ${!showSandbox ? "border-primary text-primary" : "border-border"}`} href="/admin/users">正式用户（{production.length}）</Link><Link className={`flex min-h-11 items-center rounded-md border px-4 text-body-sm ${showSandbox ? "border-primary text-primary" : "border-border"}`} href="/admin/users?sandbox=1">测试／沙盒（{sandboxUsers.length}）</Link></div>
    <form className="my-5"><input type="hidden" name="sandbox" value={showSandbox ? "1" : "0"} /><label htmlFor="user-search" className="mb-2 block text-body-sm">搜索邮箱</label><input id="user-search" name="q" defaultValue={q ?? ""} placeholder="输入完整或部分邮箱" className="h-11 w-full max-w-md rounded-md border border-border bg-surface px-3 text-body-sm" /></form>
    <div className="flex flex-col gap-3">{users.map((u) => { const meta=u.app_metadata; const adminUser=isAdmin(u); return <Card key={u.id} padding="md"><div className="flex flex-wrap items-center gap-2"><Text variant="body-sm" weight="semibold">{u.email}</Text>{showSandbox ? <Badge variant="outline">测试／沙盒</Badge> : null}</div><Text variant="caption" color="tertiary" className="mt-1 block">注册时间：{new Date(u.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</Text><Text variant="caption" color="tertiary" className="mt-1 block">角色：{adminUser ? "管理员" : "免费注册用户"} · 会员状态：{adminUser ? "永久有效" : isActiveMember(u) ? "有效" : meta.membership_status ?? "未开通"}{meta.membership_plan ? ` · 套餐 ${PLAN_LABELS[meta.membership_plan]}` : ""}{meta.membership_expires_at ? ` · 到期 ${new Date(meta.membership_expires_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}` : ""}</Text>{meta.founder_discount_percent ? <Text variant="caption" className="mt-1 block text-amber-400">创始会员：第 {meta.founder_member_rank ?? "—"} 位 · 永久{meta.founder_discount_percent === 20 ? "8折" : "9折"} · {meta.founder_discount_status === "active" ? "连续续订有效" : "已失效"}</Text> : null}{meta.pending_payment ? <Text variant="caption" color="tertiary" className="mt-1 block">待审核：{PLAN_LABELS[meta.pending_payment.plan]} · {meta.pending_payment.amount} USDT · {meta.pending_payment.discount_percent ? `创始优惠${meta.pending_payment.discount_percent}% · ` : ""}{meta.pending_payment.network} · {meta.pending_payment.tx_hash}</Text> : null}{!adminUser && !showSandbox ? <AdminUserMembershipActions userId={u.id} /> : null}</Card>; })}{!users.length ? <Text variant="body-sm" color="secondary">当前分类暂无用户。</Text> : null}</div>
  </Section></main>;
}
