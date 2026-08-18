import { Badge, Card, Heading, Text } from "@/components/ui";
import { activeKeyPersonWindow, getKeyPersonContextForAsset } from "@/lib/data/key-person-asset-context";
import { mooxDirectionLabelZh, mooxPrimaryDirection, type MooxPrimaryDirection } from "@/lib/forecasts/moox-direction-doctrine";
import type { ConvictionPeriodSlot } from "@/lib/data/conviction/access";
import type { WatchlistResonanceSignal } from "@/lib/data/conviction/resonance-types";

type Relation = { label: string; note: string; tone: "success" | "warning" | "danger" | "outline" };

function relationLabel(windowBias: "SUPPORT" | "RISK" | "MIXED", direction: MooxPrimaryDirection | null): Relation {
  if (!direction || direction === "UNCLEAR") return { label: "人物窗口独立观察", note: "标的自身方向尚未形成可比较结论。", tone: "warning" };
  if (windowBias === "RISK" && direction === "BULLISH") return { label: "人物周期背离", note: "标的研究偏多，但人物周期提示风险；方向保持不变，信心下调一档并加强事件风险提示。", tone: "danger" };
  if (windowBias === "RISK" && direction === "BEARISH") return { label: "风险共振", note: "标的研究与人物风险窗口同向，风险信号增强。", tone: "danger" };
  if (windowBias === "SUPPORT" && direction === "BULLISH") return { label: "人物周期共振", note: "标的研究与人物周期同向，信心可提升一档。", tone: "success" };
  if (windowBias === "SUPPORT" && direction === "BEARISH") return { label: "人物周期背离", note: "人物周期偏强，但标的研究偏空；不改写标的方向，只保留分歧。", tone: "warning" };
  return { label: "人物周期混合", note: "人物材料包含并行分支，不参与方向加减分。", tone: "outline" };
}

function overlappingPeriods(periods: ConvictionPeriodSlot[], start: string, end: string) {
  return periods
    .filter((slot) => slot.forecast && slot.forecast.periodStart <= end && slot.forecast.periodEnd >= start)
    .map((slot) => ({ slot, forecast: slot.forecast! }));
}

export function KeyPersonContextPanel({
  slug,
  asOfDate,
  resonanceSignal,
  periods,
}: {
  slug: string;
  asOfDate: string;
  resonanceSignal: WatchlistResonanceSignal | null;
  periods: ConvictionPeriodSlot[];
}) {
  const context = getKeyPersonContextForAsset(slug);
  if (!context) return null;
  const active = activeKeyPersonWindow(context, asOfDate);
  const currentDirection: MooxPrimaryDirection | null = resonanceSignal?.direction ?? null;
  const relation = active ? relationLabel(active.bias, currentDirection) : null;

  return (
    <Card padding="lg" className="border-violet-300/20 bg-violet-300/[0.035]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-caption uppercase tracking-[0.16em] text-violet-200/60">关键人物周期</p><Heading as="h2" size="h3" className="mt-2">{context.personZh} · {context.relationshipZh}</Heading></div>
        <Badge variant={relation?.tone ?? "outline"}>{relation?.label ?? "当前未命中人物窗口"}</Badge>
      </div>
      <Text variant="body-sm" color="secondary" className="mt-3 block leading-6">{context.summaryZh}</Text>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4"><Text variant="caption" color="tertiary" className="block">资料状态</Text><Text variant="body-sm" className="mt-1 block">{context.assumedChart}</Text><Text variant="caption" color="tertiary" className="mt-2 block">{context.calibrationStatusZh}</Text></div>
        <div className="rounded-xl border border-white/[0.08] bg-black/15 p-4"><Text variant="caption" color="tertiary" className="block">当前关系</Text><Text variant="body-sm" className="mt-1 block">{relation?.note ?? "当前日期不在老师资料明确提出的人物周期窗口内，因此不参与当前信心加减。"}</Text></div>
      </div>

      <div className="mt-4 space-y-3">
        {context.windows.map((window) => {
          const matches = overlappingPeriods(periods, window.start, window.end);
          return <div key={`${window.start}-${window.end}`} className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-caption text-white/45">{window.start}—{window.end}</span><Badge variant="outline">{window.sourceStatusZh}</Badge></div>
            <p className="mt-2 text-body-sm text-white/65">{window.labelZh}</p>
            {matches.length ? <div className="mt-3 space-y-2">{matches.map(({ slot, forecast }) => {
              const forecastDirection = mooxPrimaryDirection(forecast.direction);
              const windowRelation = relationLabel(window.bias, forecastDirection);
              return <div key={`${window.start}-${slot.type}`} className="rounded-lg border border-violet-200/10 bg-violet-200/[0.025] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-body-sm font-semibold">{slot.labelZh} · {mooxDirectionLabelZh(forecast.direction)}</span><Badge variant={windowRelation.tone}>{windowRelation.label}</Badge></div>
                <p className="mt-2 text-caption leading-5 text-white/50">{windowRelation.note}</p>
              </div>;
            })}</div> : <p className="mt-3 text-caption text-white/40">当前个股资料没有与该人物窗口重叠的正式预测，不强行计算共振。</p>}
          </div>;
        })}
      </div>
      <Text variant="caption" color="tertiary" className="mt-4 block">{context.disclosureZh}</Text>
    </Card>
  );
}
