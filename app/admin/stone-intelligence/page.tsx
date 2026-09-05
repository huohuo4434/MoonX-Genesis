import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { AdminNav } from "@/components/admin/AdminNav";
import { StoneIntelligenceClient } from "@/components/admin/StoneIntelligenceClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Stone 重要消息 · 管理员", robots: { index: false, follow: false } };
export default async function StoneIntelligencePage() {
  await requireAdminOrNotFound();
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8"><AdminNav current="/admin/stone-intelligence" /><h1 className="text-2xl font-semibold">Stone 重要消息</h1><p className="text-sm text-foreground-secondary">仅管理员可见 · 私人研究摘要 · 不自动改变正式预测或触发交易</p><StoneIntelligenceClient /></main>;
}
