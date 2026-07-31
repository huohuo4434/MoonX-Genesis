"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type {
  AdminCycleAssetClass,
  AdminCycleForecastRow,
  AdminCycleHorizon,
  AdminFullCycleSnapshot,
} from "@/types/admin-full-cycle";

type Group = AdminCycleAssetClass;

const HORIZON_LABELS: Record<AdminCycleHorizon, string> = {
  DAY: "一周内逐日",
  WEEK: "一月内逐周",
  MONTH: "一年内逐月",
};

function sortRows(rows: AdminCycleForecastRow[]) {
  return [...rows].sort((a, b) =>
    `${a.periodStart}:${a.periodEnd}`.localeCompare(`${b.periodStart}:${b.periodEnd}`)
  );
}

export function AdminForecastMatrixClient({
  initial,
}: {
  initial: AdminFullCycleSnapshot;
}) {
  const [group, setGroup] = useState<Group>("CORE");
  const [horizon, setHorizon] = useState<AdminCycleHorizon>("DAY");

  const allowedHorizons: AdminCycleHorizon[] =
    group === "CORE" ? ["DAY", "WEEK", "MONTH"] : ["WEEK", "MONTH"];

  const assets = useMemo(
    () => initial.assets.filter((asset) => asset.assetClass === group),
    [initial.assets, group]
  );

  function changeGroup(next: Group) {
    setGroup(next);
    if (next === "FOCUS" && horizon === "DAY") setHorizon("WEEK");
  }

  return (
    <div className="space-y-5">
      <Card padding="md" className="space-y-4 border-primary/20 bg-primary/[0.03]">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={group === "CORE" ? "primary" : "outline"}
            onClick={() => changeGroup("CORE")}
          >
            七大市场走势
          </Button>
          <Button
            variant={group === "FOCUS" ? "primary" : "outline"}
            onClick={() => changeGroup("FOCUS")}
          >
            重点关注走势
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allowedHorizons.map((item) => (
            <Button
              key={item}
              variant={horizon === item ? "primary" : "outline"}
              onClick={() => setHorizon(item)}
            >
              {HORIZON_LABELS[item]}
            </Button>
          ))}
        </div>

        <Text variant="body-sm" color="secondary">
          {group === "CORE"
            ? "七大市场展示：一周内每天、一个月内每周、一年内每月。"
            : "重点关注展示：本周与一个月内逐周；长期材料只作总趋势背景。"}
        </Text>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {assets.map((asset) => {
          const rows = sortRows(
            initial.forecasts.filter(
              (row) => row.assetId === asset.id && row.horizon === horizon
            )
          );

          return (
            <Card key={asset.id} padding="lg" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">
                    {asset.name} · {asset.symbol}
                  </Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">
                    {HORIZON_LABELS[horizon]}
                  </Text>
                </div>
                <Badge variant="outline">
                  {rows.length ? `${rows.length}条预测` : "暂无预测"}
                </Badge>
              </div>

              {rows.length ? (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-border/[0.10] bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Text variant="body-sm" weight="semibold">
                          {row.periodStart === row.periodEnd
                            ? row.periodStart
                            : `${row.periodStart} 至 ${row.periodEnd}`}
                        </Text>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{row.direction}</Badge>
                          <Badge variant="outline">{row.status}</Badge>
                        </div>
                      </div>
                      <Text variant="body-sm" className="mt-2 block leading-relaxed text-white/75">
                        {row.path}
                      </Text>
                      <Text variant="caption" className="mt-2 block text-white/45">
                        {row.probabilityLabel} · {row.sourceLabel} ·{" "}
                        {row.version ? `V${row.version}` : "未锁版"}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-5">
                  <Text variant="body-sm" color="secondary">
                    当前没有形成这一周期的正式预测。管理员仍能看到该资产，其缺失状态不会被隐藏。
                  </Text>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
