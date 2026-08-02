import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUserMembershipActions } from "@/components/admin/AdminUserMembershipActions";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { isActiveMember, isAdmin, listAllAuthUsers, PLAN_LABELS } from "@/lib/auth/permissions";
import { isSandboxUser } from "@/lib/admin/sandbox-data";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; sandbox?: string }> }) {
  const { q, sandbox } = await searchParams;
  const all = await listAllAuthUsers();
  const showSandbox = sandbox === "1";
  const production = all.filter((user) => !isSandboxUser(user));
  const sandboxUsers = all.filter(isSandboxUser);
  const base = showSandbox ? sandboxUsers : production;
  const users = q?.trim() ? base.filter((u) => u.email.includes(q.trim().toLowerCase())) : base;
  return <main><Section spacing="lg"><AdminNav current="/admin/users" /><Heading as="h1" size="h2">用户与会员</Heading>
    <div className="mt-4 flex flex-wrap gap-2"><Link className={`flex min-h-11 items-center rounded-md border px-4 text-body-sm ${!showSandbox ? "border-primary text-primary" : "border-border"}`} href="/admin/users">正式用户（{production.length}）</Link><Link className={`flex min-h-11 items-center rounded-md border px-4 text-body-sm ${showSandbox ? "border-primary text-primary" : "border-border"}`} href="/admin/users?sandbox=1">测试／沙盒（{sandboxUsers.length}）</Link></div>
    <form className="my-5"><input type="hidden" name="sandbox" value={showSandbox ? "1" : "0"} /><label htmlFor="user-search" className="mb-2 block text-body-sm">搜索邮箱</label><input id="user-search" name="q" defaultValue={q ?? ""} placeholder="输入完整或部分邮箱" className="h-11 w-full max-w-md rounded-md border border-border bg-surface px-3 text-body-sm" /></form>
    <div className="flex flex-col gap-3">{users.map((u) => { const meta=u.app_metadata; const adminUser=isAdmin(u); return <Card key={u.id} padding="md"><div className="flex flex-wrap items-center gap-2"><Text variant="body-sm" weight="semibold">{u.email}</Text>{showSandbox ? <Badge variant="outline">测试／沙盒</Badge> : null}</div><Text variant="caption" color="tertiary" className="mt-1 block">注册时间：{new Date(u.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</Text><Text variant="caption" color="tertiary" className="mt-1 block">角色：{adminUser ? "管理员" : "普通用户"} · 会员状态：{adminUser ? "永久有效" : isActiveMember(u) ? "有效" : meta.membership_status ?? "未开通"}{meta.membership_plan ? ` · 套餐 ${PLAN_LABELS[meta.membership_plan]}` : ""}{meta.membership_expires_at ? ` · 到期 ${new Date(meta.membership_expires_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}` : ""}</Text>{meta.pending_payment ? <Text variant="caption" color="tertiary" className="mt-1 block">待审核：{PLAN_LABELS[meta.pending_payment.plan]} · {meta.pending_payment.network} · {meta.pending_payment.tx_hash}</Text> : null}{!adminUser && !showSandbox ? <AdminUserMembershipActions userId={u.id} /> : null}</Card>; })}{!users.length ? <Text variant="body-sm" color="secondary">当前分类暂无用户。</Text> : null}</div>
  </Section></main>;
}
