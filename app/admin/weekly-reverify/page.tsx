import { requireAdminOrRedirect } from "@/lib/auth/permissions";
import { WEEKLY_SCORE_VERSION } from "@/lib/verification/weekly-verification-core";
import { WeeklyReverifyButton } from "@/components/admin/WeeklyReverifyButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WeeklyReverifyPage() {
  await requireAdminOrRedirect("/admin/weekly-reverify");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">MOOX ADMIN</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">周验证重新核算</h1>
        <p className="mt-3 text-sm leading-6 text-foreground-secondary">
          完全命中只认真正一致的路径；同方向不同路径、震荡特征部分兑现等按部分命中处理。
          历史预测文本不修改，只重新核算验证结果。
        </p>
        <div className="mt-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-xs text-foreground-tertiary">
          当前评分版本：{WEEKLY_SCORE_VERSION}
        </div>
        <div className="mt-6">
          <WeeklyReverifyButton />
        </div>
        <a href="/verification" className="mt-5 inline-block text-sm font-semibold text-primary">
          返回公开历史验证
        </a>
      </div>
    </main>
  );
}
