"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type {
  AdminFullCycleSnapshot,
  AdminLevelTimeframe,
} from "@/types/admin-full-cycle";

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fieldClass() {
  return "min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-body-sm text-white outline-none focus:border-primary/60";
}

function splitZones(value: string): string[] {
  return value
    .split(/\r?\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminSupportResistanceClient({
  initial,
}: {
  initial: AdminFullCycleSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [assetId, setAssetId] = useState(initial.assets[0]?.id ?? "bitcoin");
  const [timeframe, setTimeframe] = useState<AdminLevelTimeframe>("4H");
  const [effectiveDate, setEffectiveDate] = useState(dateKey());
  const [supports, setSupports] = useState("");
  const [resistances, setResistances] = useState("");
  const [confirmation, setConfirmation] = useState(
    "连续两根4小时K线收盘站稳区间外，或一根日线收盘确认"
  );
  const [invalidation, setInvalidation] = useState("");
  const [note, setNote] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [eventDate, setEventDate] = useState(dateKey());
  const [eventNote, setEventNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const zones = useMemo(
    () =>
      snapshot.priceZones.filter((item) => item.assetId === assetId),
    [snapshot.priceZones, assetId]
  );
  const events = useMemo(
    () =>
      snapshot.breakoutEvents.filter((item) => item.assetId === assetId),
    [snapshot.breakoutEvents, assetId]
  );

  async function refresh() {
    const res = await fetch("/api/admin/full-cycle", { cache: "no-store" });
    const json = (await res.json()) as AdminFullCycleSnapshot & { error?: string };
    if (!res.ok) throw new Error(json.error || "刷新失败");
    setSnapshot(json);
  }

  async function post(body: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/full-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      await refresh();
      setMessage("已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  const supportRows = splitZones(supports);
  const resistanceRows = splitZones(resistances);

  return (
    <div className="space-y-6">
      <Card padding="md" className="border-primary/20 bg-primary/[0.03]">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-caption text-white/45">资产</span>
            <select
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              className={fieldClass()}
            >
              {snapshot.assets.map((asset) => (
                <option key={asset.id} value={asset.id} className="bg-[#111318]">
                  {asset.name} · {asset.symbol} ·{" "}
                  {asset.assetClass === "CORE" ? "七大市场" : "重点关注"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">确认周期</span>
            <select
              value={timeframe}
              onChange={(event) =>
                setTimeframe(event.target.value as AdminLevelTimeframe)
              }
              className={fieldClass()}
            >
              <option className="bg-[#111318]" value="4H">4小时</option>
              <option className="bg-[#111318]" value="1D">日线</option>
              <option className="bg-[#111318]" value="1W">周线</option>
            </select>
          </label>
        </div>
        {message ? (
          <Text variant="body-sm" className="mt-3 block text-primary">
            {message}
          </Text>
        ) : null}
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card padding="lg" className="space-y-4">
          <Text variant="body" weight="semibold">
            录入支撑与压力区间
          </Text>
          <label className="space-y-1">
            <span className="text-caption text-white/45">生效日期</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              className={fieldClass()}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">
              支撑区间（每行一个，例如 62800—63600）
            </span>
            <textarea
              value={supports}
              onChange={(event) => setSupports(event.target.value)}
              className={`${fieldClass()} min-h-28`}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">
              压力区间（每行一个，例如 64700—65100）
            </span>
            <textarea
              value={resistances}
              onChange={(event) => setResistances(event.target.value)}
              className={`${fieldClass()} min-h-28`}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">突破确认条件</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={fieldClass()}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">失效条件</span>
            <input
              value={invalidation}
              onChange={(event) => setInvalidation(event.target.value)}
              className={fieldClass()}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">备注</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`${fieldClass()} min-h-20`}
            />
          </label>
          <Button
            disabled={
              loading || (!supportRows.length && !resistanceRows.length)
            }
            onClick={() =>
              post({
                action: "save-price-zone",
                assetId,
                timeframe,
                effectiveDate,
                supportLevels: supportRows,
                resistanceLevels: resistanceRows,
                confirmation,
                invalidation,
                note,
              })
            }
          >
            {loading ? "保存中…" : "保存支撑压力区"}
          </Button>
        </Card>

        <div className="space-y-3">
          <Text variant="body" weight="semibold">
            已保存区间
          </Text>
          {zones.length ? (
            zones.map((item) => (
              <Card key={item.id} padding="md" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {item.timeframe} · {item.effectiveDate}
                  </Text>
                  <Badge variant="outline">启用</Badge>
                </div>
                <Text variant="body-sm" className="block text-emerald-300/80">
                  支撑：{item.supportLevels.join("；") || "—"}
                </Text>
                <Text variant="body-sm" className="block text-rose-300/80">
                  压力：{item.resistanceLevels.join("；") || "—"}
                </Text>
                {item.confirmation ? (
                  <Text variant="caption" className="block text-white/50">
                    确认：{item.confirmation}
                  </Text>
                ) : null}
                {item.invalidation ? (
                  <Text variant="caption" className="block text-white/50">
                    失效：{item.invalidation}
                  </Text>
                ) : null}
              </Card>
            ))
          ) : (
            <Card padding="lg">
              <Text variant="body-sm" color="secondary">
                该资产尚未录入支撑压力区。
              </Text>
            </Card>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card padding="lg" className="space-y-4">
          <Text variant="body" weight="semibold">
            突破后检查卦象是否支持
          </Text>
          <label className="space-y-1">
            <span className="text-caption text-white/45">事件日期</span>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className={fieldClass()}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">
              4小时或日线确认收盘价
            </span>
            <input
              inputMode="decimal"
              value={closePrice}
              onChange={(event) => setClosePrice(event.target.value)}
              className={fieldClass()}
            />
          </label>
          <label className="space-y-1">
            <span className="text-caption text-white/45">备注</span>
            <textarea
              value={eventNote}
              onChange={(event) => setEventNote(event.target.value)}
              className={`${fieldClass()} min-h-20`}
            />
          </label>
          <Button
            disabled={loading || !Number(closePrice)}
            onClick={() =>
              post({
                action: "evaluate-breakout",
                assetId,
                timeframe,
                eventDate,
                closePrice: Number(closePrice),
                note: eventNote,
              })
            }
          >
            {loading ? "判断中…" : "检查突破与卦象一致性"}
          </Button>
          <Text variant="caption" className="block text-white/40">
            突破只生成未来修订候选，不覆盖已经发布的原预测。
          </Text>
        </Card>

        <div className="space-y-3">
          <Text variant="body" weight="semibold">
            突破复核记录
          </Text>
          {events.length ? (
            events.map((item) => (
              <Card key={item.id} padding="md" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {item.eventDate} · {item.timeframe} · 收盘 {item.closePrice}
                  </Text>
                  <Badge variant="outline">{item.eventType}</Badge>
                </div>
                <Text
                  variant="body-sm"
                  className={
                    item.alignment === "ALIGNED"
                      ? "text-emerald-300"
                      : item.alignment === "CONFLICT"
                        ? "text-rose-300"
                        : "text-amber-200"
                  }
                >
                  卦象一致性：{item.alignment}
                </Text>
                <Text variant="caption" className="block leading-relaxed text-white/55">
                  {item.evidence}
                </Text>
              </Card>
            ))
          ) : (
            <Card padding="lg">
              <Text variant="body-sm" color="secondary">
                尚无突破复核记录。
              </Text>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
