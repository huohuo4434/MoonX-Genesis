import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, Heading, Section, Text } from "@/components/ui";
import { isActiveMember, isAdmin, listAllAuthUsers, requireAdminOrRedirect } from "@/lib/auth/permissions";
import { isSandboxUser } from "@/lib/admin/sandbox-data";
import { buildAdminCycleGapSummary, summarizeConsultationQueue } from "@/lib/admin/admin-home-operations";
import { listAdminConsultations } from "@/lib/consultations/store";
import { loadTodayForecastRows, loadTomorrowForecastRows } from "@/lib/prediction-access-server";
import { getConvictionWeeklyFreshnessOverview } from "@/lib/data/conviction/admin-weekly-freshness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  await requireAdminOrRedirect("/admin");
  const now = new Date();
  const [users, today, tomorrow, consultations] = await Promise.allSettled([
    listAllAuthUsers(),
    loadTodayForecastRows(now),
    loadTomorrowForecastRows(now),
    listAdminConsultations(),
  ]);
  const memberCount = users.status === "fulfilled"
    ? users.value.filter((u) => !isSandboxUser(u) && isActiveMember(u) && !isAdmin(u)).length
    : null;
  const queue = consultations.status === "fulfilled" ? summarizeConsultationQueue(consultations.value) : null;
  const freshness = getConvictionWeeklyFreshnessOverview(now);
  const cycleGaps = buildAdminCycleGapSummary(now);
  const tasks: Array<{ label: string; href: string; urgent?: boolean }> = [];
  if (users.status === "rejected") tasks.push({ label: "会员数据读取失败，请核对", href: "/admin/users", urgent: true });
  if (today.status === "rejected") tasks.push({ label: "今日发布情况读取失败", href: "/admin/forecasts", urgent: true });
  else if (!today.value.length) tasks.push({ label: "今日暂无正式观点，检查发布情况", href: "/admin/forecasts" });
  if (tomorrow.status === "rejected") tasks.push({ label: "下一交易日发布情况读取失败", href: "/admin/forecasts", urgent: true });
  else if (!tomorrow.value.length) tasks.push({ label: "下一交易日观点待准备", href: "/admin/forecasts" });
  if (!queue) tasks.push({ label: "问卦队列读取失败，待回复数量未知", href: "/admin/consultations", urgent: true });
  else if (queue.total > 0) tasks.push({
    label: `会员问卦待处理 ${queue.total} 笔${queue.failed ? `（含异常 ${queue.failed} 笔）` : ""}`,
    href: "/admin/consultations", urgent: queue.failed > 0,
  });
  if (freshness.current < freshness.total) tasks.push({
    label: `重点关注待更新 ${freshness.total - freshness.current} 项：${freshness.affectedAssets.join("、")}`,
    href: "/admin/stocks",
  });
  const nearTermGaps = cycleGaps.blockingTaskCount + cycleGaps.actionTaskCount;
  if (nearTermGaps) tasks.push({ label: `未来一周生效的周期资料待补 ${nearTermGaps} 项`, href: "/admin/weekly", urgent: cycleGaps.blockingTaskCount > 0 });
  tasks.sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  const tiles = [
    { label: "有效会员", value: memberCount, href: "/admin/users" },
    { label: "今日观点", value: today.status === "fulfilled" ? today.value.length : null, href: "/admin/forecasts" },
    { label: "下一交易日观点", value: tomorrow.status === "fulfilled" ? tomorrow.value.length : null, href: "/admin/forecasts" },
    { label: "问卦待处理", value: queue?.total ?? null, href: "/admin/consultations" },
  ];

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin" />
        <Heading as="h1" size="h2">管理后台</Heading>
        <Text variant="caption" color="secondary" className="mt-2 block">
          本次读取：{now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}（北京时间）
        </Text>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="关键数字">
          {tiles.map((tile) => (
            <Link key={tile.label} href={tile.href} prefetch={false}>
              <Card padding="md" className="h-full hover:border-primary/40">
                <Text variant="caption" color="secondary">{tile.label}</Text>
                <Text variant="body" weight="semibold" className="mt-1 block">{tile.value ?? "读取失败"}</Text>
              </Card>
            </Link>
          ))}
        </div>
        <Card padding="md" className="mt-4">
          <Heading as="h2" size="h3">待办事项 · {tasks.length}</Heading>
          {tasks.length ? (
            <ul className="mt-3 divide-y divide-border/20">
              {tasks.map((task) => (
                <li key={task.label}>
                  <Link href={task.href} prefetch={false} className={`flex min-h-11 items-center justify-between gap-3 py-3 text-sm hover:underline ${task.urgent ? "text-red-400" : "text-foreground-secondary"}`}>
                    <span>{task.label}</span><span className="shrink-0">处理 →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Text variant="body-sm" color="secondary" className="mt-3 block">本页检查的内容与问卦队列暂无待办。</Text>}
        </Card>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/admin/live-trading" prefetch={false}>
            <Card padding="md"><Text weight="semibold">交易运行 →</Text><Text variant="caption" color="secondary" className="mt-1 block">查看实际开仓权限、持仓和停止原因。</Text></Card>
          </Link>
          <Link href="/admin/site-health" prefetch={false}>
            <Card padding="md"><Text weight="semibold">系统健康 →</Text><Text variant="caption" color="secondary" className="mt-1 block">查看服务检查结果与异常。</Text></Card>
          </Link>
        </div>
        {cycleGaps.preparationTaskCount > 0 ? (
          <details className="mt-4 rounded-lg border border-border/20 p-4 text-sm text-foreground-secondary">
            <summary className="cursor-pointer">后续准备 · {cycleGaps.preparationTaskCount} 项（距生效超过 7 天）</summary>
            <p className="mt-3">检查范围：{cycleGaps.weeklyStart}—{cycleGaps.weeklyEnd}、{cycleGaps.monthlyLabel}。</p>
            <Link className="mt-2 inline-flex min-h-11 items-center underline" href="/admin/weekly" prefetch={false}>查看周期资料</Link>
          </details>
        ) : null}
      </Section>
    </main>
  );
}
