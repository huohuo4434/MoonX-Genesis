import { Badge, Card } from "@/components/ui";
import type {
  FocusDualMethodDailyRow,
  FocusMethodVerificationStats,
  FocusQimenHorizonReading,
  FocusQimenParallelView,
} from "@/lib/forecasts/focus-qimen-multihorizon";
import type { FocusQimenRelation, FocusQimenValidationStatus } from "@/lib/forecasts/focus-qimen-parallel";

const DAY_STATE = {
  OCCURRED: "已发生",
  TODAY: "今日",
  PENDING: "待验证",
  MISSING: "六爻待补",
} as const;

function relationClass(relation: FocusQimenRelation): string {
  if (relation === "RESONANCE") return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100";
  if (relation === "DIVERGENCE") return "border-violet-300/25 bg-violet-300/[0.06] text-violet-100";
  if (relation === "NOT_COMPARABLE") return "border-white/10 bg-white/[0.03] text-white/55";
  return "border-cyan-300/20 bg-cyan-300/[0.04] text-cyan-100/70";
}

function validationLabel(status: FocusQimenValidationStatus): string {
  if (status === "PENDING") return "前置样本·待验证";
  if (status === "RETROACTIVE_BASELINE") return "历史补盘·不计命中";
  if (status === "NOT_ELIGIBLE") return "休市/无有效交易日";
  return "盘面不可用";
}

function directionClass(direction: string | null): string {
  if (!direction) return "border-white/10 text-white/45";
  if (/涨|多|强|反弹|回升|上扬/.test(direction)) return "border-emerald-300/20 text-emerald-100";
  if (/跌|空|弱|回落|探底/.test(direction)) return "border-rose-300/20 text-rose-100";
  return "border-cyan-300/20 text-cyan-100";
}

function percent(hits: number, partial: number, samples: number): string {
  if (!samples) return "样本采集中";
  return `${Math.round(((hits + partial * 0.5) / samples) * 100)}%`;
}

function DailyRows({ rows }: { rows: FocusDualMethodDailyRow[] }) {
  if (!rows.length) {
    return <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.03] p-3 text-body-sm text-amber-100/70">本期没有可展示的逐日范围；不会生成虚构的六爻或奇门结论。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="min-w-[1040px] w-full border-collapse text-left">
        <thead className="bg-white/[0.035] text-caption text-white/45">
          <tr>
            <th className="px-3 py-3 font-medium">日期</th>
            <th className="px-3 py-3 font-medium">六爻日走势</th>
            <th className="px-3 py-3 font-medium">奇门日走势</th>
            <th className="px-3 py-3 font-medium">两法关系</th>
            <th className="px-3 py-3 font-medium">验证资格</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.07]">
          {rows.map((row) => (
            <tr key={row.date} className="align-top bg-black/10">
              <td className="whitespace-nowrap px-3 py-4">
                <p className="text-body-sm font-medium text-white">{row.date}</p>
                <p className="mt-1 text-[11px] text-white/35">{DAY_STATE[row.state]}</p>
              </td>
              <td className="max-w-[300px] px-3 py-4">
                <Badge variant="outline" className={directionClass(row.liuyaoDirection)}>{row.liuyaoDirection ?? "待补"}</Badge>
                <p className="mt-2 text-caption leading-6 text-white/55">{row.liuyaoSummary}</p>
              </td>
              <td className="max-w-[340px] px-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={directionClass(row.qimen.direction)}>{row.qimen.direction}</Badge>
                  {row.qimen.confidence != null ? <span className="text-[11px] text-violet-100/65">置信 {row.qimen.confidence}%</span> : null}
                </div>
                <p className="mt-2 text-caption leading-6 text-violet-100/65">{row.qimen.mysticNote}</p>
                <p className="mt-1 text-[11px] text-white/35">{row.qimen.useGod} · {row.qimen.castAt}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-4">
                <Badge variant="outline" className={relationClass(row.relation)}>{row.relationLabel}</Badge>
              </td>
              <td className="max-w-[190px] px-3 py-4 text-caption leading-6 text-white/50">
                {validationLabel(row.qimen.validationStatus)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HorizonRows({ rows }: { rows: FocusQimenHorizonReading[] }) {
  if (!rows.length) {
    return <p className="text-caption text-white/45">尚无正式锁定的周、月或年度六爻周期，因此不补造对应奇门周期结论。</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="min-w-[1160px] w-full border-collapse text-left">
        <thead className="bg-white/[0.035] text-caption text-white/45">
          <tr>
            <th className="px-3 py-3 font-medium">周期</th>
            <th className="px-3 py-3 font-medium">六爻体系</th>
            <th className="px-3 py-3 font-medium">奇门体系</th>
            <th className="px-3 py-3 font-medium">关系</th>
            <th className="px-3 py-3 font-medium">起局 / 统计</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.07]">
          {rows.map((row) => (
            <tr key={`${row.forecastId}-${row.periodStart}-${row.periodEnd}`} className="align-top bg-black/10">
              <td className="min-w-[180px] px-3 py-4">
                <p className="text-body-sm font-medium text-white">{row.periodLabel}</p>
                <p className="mt-1 text-[11px] text-white/35">{row.methodLabel}</p>
              </td>
              <td className="max-w-[350px] px-3 py-4">
                <Badge variant="outline" className={directionClass(row.liuyaoDirection)}>{row.liuyaoDirection}</Badge>
                <p className="mt-2 text-caption leading-6 text-white/55">{row.liuyaoSummary}</p>
              </td>
              <td className="max-w-[360px] px-3 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={directionClass(row.qimenDirection)}>{row.qimenDirection}</Badge>
                  {row.qimenConfidence != null ? <span className="text-[11px] text-violet-100/65">置信 {row.qimenConfidence}%</span> : null}
                </div>
                <p className="mt-2 text-caption leading-6 text-violet-100/65">{row.qimenMysticNote}</p>
                <p className="mt-1 text-[11px] text-white/35">用神 {row.useGod} · {row.useGodBasisLabel}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-4">
                <Badge variant="outline" className={relationClass(row.relation)}>{row.relationLabel}</Badge>
              </td>
              <td className="max-w-[250px] px-3 py-4 text-caption leading-6 text-white/50">
                <p>{row.castAt}</p>
                <p className="mt-1">{validationLabel(row.validationStatus)}</p>
                {row.retroactiveNotice ? <p className="mt-1 text-amber-100/60">{row.retroactiveNotice}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stats({ stats }: { stats: FocusMethodVerificationStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card padding="sm" className="border-amber-300/15 bg-amber-300/[0.025]">
        <p className="text-caption text-amber-100/65">日度共振 / 分歧</p>
        <p className="mt-1 text-xl font-semibold text-white">{stats.daily.resonance} / {stats.daily.divergence}</p>
        <p className="mt-1 text-[11px] text-white/35">待验证 {stats.daily.forwardPending} · 历史补盘排除 {stats.daily.retroactiveExcluded}</p>
      </Card>
      <Card padding="sm" className="border-violet-300/15 bg-violet-300/[0.025]">
        <p className="text-caption text-violet-100/65">多周期共振 / 分歧</p>
        <p className="mt-1 text-xl font-semibold text-white">{stats.horizons.resonance} / {stats.horizons.divergence}</p>
        <p className="mt-1 text-[11px] text-white/35">前置待验 {stats.horizons.forwardPending} · 补盘排除 {stats.horizons.retroactiveExcluded}</p>
      </Card>
      <Card padding="sm" className="border-cyan-300/15 bg-cyan-300/[0.025]">
        <p className="text-caption text-cyan-100/65">六爻独立命中率</p>
        <p className="mt-1 text-xl font-semibold text-white">{percent(stats.liuyaoVerified.hits, stats.liuyaoVerified.partial, stats.liuyaoVerified.samples)}</p>
        <p className="mt-1 text-[11px] text-white/35">有效样本 {stats.liuyaoVerified.samples} · 未命中 {stats.liuyaoVerified.misses}</p>
      </Card>
      <Card padding="sm" className="border-fuchsia-300/15 bg-fuchsia-300/[0.025]">
        <p className="text-caption text-fuchsia-100/65">奇门独立命中率</p>
        <p className="mt-1 text-xl font-semibold text-white">{percent(stats.qimenVerified.hits, stats.qimenVerified.partial, stats.qimenVerified.samples)}</p>
        <p className="mt-1 text-[11px] text-white/35">有效样本 {stats.qimenVerified.samples} · 未命中 {stats.qimenVerified.misses}</p>
      </Card>
    </div>
  );
}

export function FocusQimenParallelPanel({ view }: { view: FocusQimenParallelView }) {
  return (
    <section className="space-y-4 rounded-2xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(22,16,40,.70),rgba(5,10,16,.92))] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-4xl">
          <p className="font-mono text-caption uppercase tracking-[0.16em] text-violet-200/65">MOOX DUAL METHOD LAB</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{view.title}</h3>
          <p className="mt-2 text-body-sm leading-7 text-white/70">{view.notice}</p>
        </div>
        <Badge variant="outline" className="border-violet-300/25 text-violet-100">互不覆盖</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.7fr]">
        <Card padding="sm" className="border-violet-300/15 bg-violet-300/[0.035]">
          <p className="text-caption font-semibold text-violet-100">产品用神</p>
          <p className="mt-2 text-body-sm text-white/80">{view.useGod.displayName} · {view.useGod.label}</p>
          <p className="mt-1 text-caption text-white/50">主：{view.useGod.primary.join("/") || "时干"} · 辅：{view.useGod.secondary.join("/") || "日干/值符值使"}</p>
          <Badge variant="outline" className="mt-2 border-white/10 text-white/55">{view.useGod.basisLabel}</Badge>
          <p className="mt-2 text-caption leading-6 text-white/45">{view.useGod.note}</p>
        </Card>
        <Card padding="sm" className="border-white/[0.08] bg-black/20">
          <p className="text-caption font-semibold text-white/70">来源与方法边界</p>
          <p className="mt-2 text-caption leading-6 text-white/50">{view.sourceBoundary}</p>
          <p className="mt-2 text-caption leading-6 text-amber-100/60">同向只标记共振，不自动抬高或降低任一方法原始置信；最终以各自历史验证成绩判断。</p>
        </Card>
      </div>

      <Stats stats={view.stats} />

      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="text-body font-semibold text-white">未来一周逐日双法表</h4>
            <p className="mt-1 text-caption text-white/40">六爻保留原始逐日路径；奇门按同日时空盘和产品用神独立计算。</p>
          </div>
          <p className="text-caption text-white/35">历史补盘不计准确率</p>
        </div>
        <div className="mt-3"><DailyRows rows={view.dailyRows} /></div>
      </div>

      <details open className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
        <summary className="cursor-pointer text-body font-semibold text-white">周 / 月 / 年等多周期双法对照</summary>
        <p className="mt-2 text-caption leading-6 text-white/45">凡已有正式六爻周期，均生成独立“时家奇门·周期起局”记录；不把周期起局冒充月家或年家奇门。</p>
        <div className="mt-3"><HorizonRows rows={view.horizonRows} /></div>
      </details>

      <p className="text-caption leading-6 text-white/35">{view.stats.note}</p>
    </section>
  );
}
