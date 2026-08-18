import { AdminNav } from "@/components/admin/AdminNav";
import { XOpinionMatrixClient } from "@/components/admin/x-opinions/XOpinionMatrixClient";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { getXOpinionMatrix } from "@/lib/trading-signals/x-opinion-matrix";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminXOpinionMatrixPage() {
  await requireAdminOrNotFound();
  const matrix = await getXOpinionMatrix({ lookbackDays: 7 });
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
      <AdminNav current="/admin/x-opinion-matrix" />
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-300">MOOX X OPINION MATRIX · ADMIN ONLY</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">博主观点矩阵</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">左侧按你指定的X博主排列，上方按标的排列。单元格只保留最近观点的方向、点位、时间和一句摘要。批准后可设置1—10%的管理员权重；“可展示”只是保存展示许可，当前矩阵仍只在后台可见。</p>
      </div>
      <XOpinionMatrixClient initial={matrix} />
    </main>
  );
}
