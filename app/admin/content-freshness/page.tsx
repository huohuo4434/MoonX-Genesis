import { AdminNav } from "@/components/admin/AdminNav";
import { ContentFreshnessClient } from "@/components/admin/content-freshness/ContentFreshnessClient";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { getStoredContentFreshnessReport, runContentFreshnessSelfCheck } from "@/lib/automation/content-freshness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminContentFreshnessPage() {
  await requireAdminOrNotFound();
  const report = await getStoredContentFreshnessReport() ?? await runContentFreshnessSelfCheck({ repair: false });
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
      <AdminNav current="/admin/content-freshness" />
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">MOOX CONTENT FRESHNESS · SELF HEAL</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">内容更新与自检中心</h1>
      <p className="mt-2 mb-6 max-w-4xl text-sm leading-6 text-slate-400">所有自动版块有固定更新规则。自检先检查覆盖和新鲜度，可安全补跑的任务自动补跑，然后立即二次检查；周卦、月卦等正式研究缺失时只报警，绝不自动编造。</p>
      <ContentFreshnessClient initial={report} />
    </main>
  );
}
