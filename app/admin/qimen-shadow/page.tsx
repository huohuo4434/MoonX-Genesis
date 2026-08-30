import { AdminNav } from "@/components/admin/AdminNav";
import { Badge, Card, Heading, Text } from "@/components/ui";
import { requireAdminOrNotFound } from "@/lib/auth/require-admin-or-404";
import { getQimenShadowDashboard } from "@/lib/research/qimen-shadow-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const variantLabels: Record<string, string> = {
  BASE_FORMAL_CHAN: "正式方向＋技术基线",
  OBJECT_YONGSHEN_FILTER: "对象用神流派过滤",
  DIRECTIONAL_PALACE_FILTER: "定向取宫流派过滤",
  QIMEN_RESONANCE_FILTER: "两派同向共振",
  QIMEN_DIVERGENCE_GUARD: "两派分歧保护",
};

function value(value: number | null, suffix = "") {
  return value == null || !Number.isFinite(value) ? "—" : `${value}${suffix}`;
}

export default async function AdminQimenShadowPage() {
  await requireAdminOrNotFound();
  let dashboard: Awaited<ReturnType<typeof getQimenShadowDashboard>> | null = null;
  let loadError = "";
  try {
    dashboard = await getQimenShadowDashboard();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "读取失败";
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
      <AdminNav current="/admin/qimen-shadow" />
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">QIMEN SHADOW A/B · RESEARCH ONLY</p>
      <Heading as="h1" size="h2" className="mt-2">奇门流派前瞻影子账本</Heading>
      <Text variant="body-sm" color="secondary" className="mt-2 max-w-4xl">
        决策前先由服务器锁定正式预测、两派证据哈希和技术点位；到预先约定的评估时间后，再用闭合K线回放五组策略。这里只评估择时效果，不产生正式方向，不连接交易所，也不能恢复实盘。
      </Text>

      <Card padding="md" className="mt-5 border border-amber-500/40 bg-amber-500/10">
        <Text variant="body-sm">研究样本一经写入不可修改或删除；同编号不同内容会被拒绝。至少30次前瞻观察、跨30天且实际模拟入场不少于10次，才可能标记为研究样本合格；合格仍不代表可用于LIVE。</Text>
      </Card>

      {loadError ? (
        <Card padding="md" className="mt-5 border border-red-500/40 bg-red-500/10">
          <Text variant="body-sm">数据库尚未具备影子账本或读取失败：{loadError}</Text>
        </Card>
      ) : null}

      {dashboard ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card padding="md"><Text variant="caption" color="tertiary">实验总数</Text><Heading as="h2" size="h3" className="mt-1">{dashboard.totalExperiments}</Heading></Card>
            <Card padding="md"><Text variant="caption" color="tertiary">已锁定待评估</Text><Heading as="h2" size="h3" className="mt-1">{dashboard.pendingObservations}</Heading></Card>
            <Card padding="md"><Text variant="caption" color="tertiary">最近样本覆盖标的</Text><Heading as="h2" size="h3" className="mt-1">{new Set(dashboard.experiments.map((item) => item.symbol)).size}</Heading></Card>
            <Card padding="md"><Text variant="caption" color="tertiary">损坏快照</Text><Heading as="h2" size="h3" className="mt-1">{dashboard.corruptExperiments}</Heading></Card>
            <Card padding="md"><Text variant="caption" color="tertiary">LIVE权限</Text><Heading as="h2" size="h3" className="mt-1">永不授予</Heading></Card>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {dashboard.summaries.map((item) => (
              <Card key={item.variantId} padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Heading as="h2" size="h3">{variantLabels[item.variantId] ?? item.variantId}</Heading>
                    <Text variant="caption" color="tertiary" className="mt-1 block">样本跨度 {item.stableDays} 天</Text>
                  </div>
                  <Badge variant="outline">{item.researchQualified ? "研究样本合格" : item.sampleReady ? "仍需有效入场" : "继续积累"}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><Text variant="caption" color="tertiary">观察</Text><Text variant="body-sm" weight="semibold" className="block">{item.observations}</Text></div>
                  <div><Text variant="caption" color="tertiary">进入/等待</Text><Text variant="body-sm" weight="semibold" className="block">{item.entered}/{item.waited}</Text></div>
                  <div><Text variant="caption" color="tertiary">平均R</Text><Text variant="body-sm" weight="semibold" className="block">{value(item.averageR)}</Text></div>
                  <div><Text variant="caption" color="tertiary">利润因子</Text><Text variant="body-sm" weight="semibold" className="block">{item.profitFactor === Number.POSITIVE_INFINITY ? "∞" : value(item.profitFactor)}</Text></div>
                  <div><Text variant="caption" color="tertiary">平均MFE</Text><Text variant="body-sm" weight="semibold" className="block">{value(item.averageMfeR, "R")}</Text></div>
                  <div><Text variant="caption" color="tertiary">平均MAE</Text><Text variant="body-sm" weight="semibold" className="block">{value(item.averageMaeR, "R")}</Text></div>
                  <div><Text variant="caption" color="tertiary">避免基线亏损</Text><Text variant="body-sm" weight="semibold" className="block">{item.avoidedBaselineLosses}</Text></div>
                  <div><Text variant="caption" color="tertiary">可启用实盘</Text><Text variant="body-sm" weight="semibold" className="block">否</Text></div>
                </div>
              </Card>
            ))}
          </div>
          <Text variant="caption" color="tertiary" className="mt-3 block">上方绩效统计按最近最多300个已评估实验计算；实验总数与待评估数量使用数据库全量计数。</Text>

          <Card padding="lg" className="mt-6 overflow-x-auto">
            <Heading as="h2" size="h3">最近锁定实验</Heading>
            {dashboard.experiments.length ? (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="text-white/50"><tr><th className="px-2 py-2">决策时间</th><th className="px-2 py-2">标的</th><th className="px-2 py-2">周期</th><th className="px-2 py-2">正式方向</th><th className="px-2 py-2">预测绑定</th><th className="px-2 py-2">快照哈希</th></tr></thead>
                <tbody>{dashboard.experiments.slice(0, 50).map((item) => (
                  <tr key={item.id} className="border-t border-white/10"><td className="px-2 py-3">{item.decisionAt.toISOString()}</td><td className="px-2 py-3">{item.symbol}</td><td className="px-2 py-3">{item.horizon}</td><td className="px-2 py-3">{item.officialDirection}</td><td className="px-2 py-3">{item.formalForecastId} · {item.formalForecastVersion}</td><td className="px-2 py-3 font-mono text-xs text-white/50">{item.contentSha256.slice(0, 16)}…</td></tr>
                ))}</tbody>
              </table>
            ) : <Text variant="body-sm" color="secondary" className="mt-4">尚无前瞻实验。系统不会拿历史结果反填样本；下一份决策前完整奇门读数写入后才开始累计。</Text>}
          </Card>

          <Card padding="lg" className="mt-6 overflow-x-auto">
            <Heading as="h2" size="h3">决策前锁定观察</Heading>
            {dashboard.observations.length ? (
              <table className="mt-4 min-w-full text-left text-sm">
                <thead className="text-white/50"><tr><th className="px-2 py-2">观察编号</th><th className="px-2 py-2">标的</th><th className="px-2 py-2">决策时间</th><th className="px-2 py-2">预定评估</th><th className="px-2 py-2">状态</th></tr></thead>
                <tbody>{dashboard.observations.slice(0, 50).map((item) => (
                  <tr key={item.id} className="border-t border-white/10"><td className="px-2 py-3 font-mono text-xs">{item.id}</td><td className="px-2 py-3">{item.symbol}</td><td className="px-2 py-3">{item.decisionAt.toISOString()}</td><td className="px-2 py-3">{item.evaluationDueAt.toISOString()}</td><td className="px-2 py-3">{item.experiment ? "已评估" : "等待到期"}</td></tr>
                ))}</tbody>
              </table>
            ) : <Text variant="body-sm" color="secondary" className="mt-4">尚无决策前锁定观察；没有提前锁定的材料不会进入前瞻统计。</Text>}
          </Card>
        </>
      ) : null}
    </main>
  );
}
