"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type { ManualMarketPrice } from "@/lib/market-data/manual-market-prices";
import type { TradingSignalLivePrice } from "@/lib/market-data/trading-signal-live-prices";

type AssetRow = { symbol: string; name: string; venue: string };

type ApiPayload = {
  assets?: AssetRow[];
  manual?: ManualMarketPrice[];
  live?: TradingSignalLivePrice[];
  warnings?: string[];
  testedAt?: string;
  error?: string;
};

function fieldClass() {
  return "min-h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";
}

function localDateTimeValue(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const offset = safe.getTimezoneOffset() * 60_000;
  return new Date(safe.getTime() - offset).toISOString().slice(0, 16);
}

function displayTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function ManualMarketPricesClient({
  assets,
  initialManual,
}: {
  assets: readonly AssetRow[];
  initialManual: ManualMarketPrice[];
}) {
  const [manual, setManual] = useState(initialManual);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialManual.map((row) => [row.symbol, String(row.price)]))
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialManual.map((row) => [row.symbol, row.note]))
  );
  const [capturedAt, setCapturedAt] = useState(localDateTimeValue());
  const [live, setLive] = useState<TradingSignalLivePrice[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const manualMap = useMemo(
    () => new Map(manual.map((row) => [row.symbol, row] as const)),
    [manual]
  );
  const liveMap = useMemo(
    () => new Map(live.map((row) => [row.normalizedSymbol, row] as const)),
    [live]
  );

  async function saveAll() {
    const capturedDate = new Date(capturedAt);
    if (Number.isNaN(capturedDate.getTime())) {
      setMessage("价格对应时间无效，请重新选择");
      return;
    }

    const prices = assets
      .map((asset) => ({
        symbol: asset.symbol,
        price: Number(values[asset.symbol]),
        note: notes[asset.symbol] ?? "",
        capturedAt: capturedDate.toISOString(),
      }))
      .filter((row) => Number.isFinite(row.price) && row.price > 0);

    if (!prices.length) {
      setMessage("请至少填写一个有效价格");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/market-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setManual(payload.manual ?? []);
      setMessage(`已保存 ${prices.length} 项手动行情`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function testLive() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/market-prices?test=1", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error || "行情测试失败");
      setLive(payload.live ?? []);
      setWarnings(payload.warnings ?? []);
      setManual(payload.manual ?? manual);
      setMessage(`行情测试完成：取得 ${payload.live?.length ?? 0} 项价格`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "行情测试失败");
    } finally {
      setLoading(false);
    }
  }

  async function clearOne(symbol: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/market-prices?symbol=${encodeURIComponent(symbol)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiPayload & { ok?: boolean };
      if (!response.ok) throw new Error(payload.error || "清除失败");
      setManual((rows) => rows.filter((row) => row.symbol !== symbol));
      setValues((current) => ({ ...current, [symbol]: "" }));
      setNotes((current) => ({ ...current, [symbol]: "" }));
      setMessage(`${symbol}手动价格已清除`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "清除失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card padding="lg" className="space-y-4 border-primary/20 bg-primary/[0.025]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Text variant="body" weight="semibold">行情来源顺序</Text>
            <Text variant="body-sm" color="secondary" className="mt-1 block max-w-3xl">
              优先读取MoonX DEX底层Orderly公开行情；再尝试Bitget、Hyperliquid、Yahoo、Stooq和DexScreener。自动源都失败时，才使用这里最近96小时内的手动价格。
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={loading} onClick={testLive}>
              测试自动行情
            </Button>
            <Button disabled={loading} onClick={saveAll}>
              {loading ? "处理中…" : "保存全部已填写价格"}
            </Button>
          </div>
        </div>
        <label className="block max-w-sm space-y-1">
          <span className="text-caption text-white/45">价格对应时间</span>
          <input
            type="datetime-local"
            value={capturedAt}
            onChange={(event) => setCapturedAt(event.target.value)}
            className={fieldClass()}
          />
        </label>
        {message ? <Text variant="body-sm" className="block text-primary">{message}</Text> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {assets.map((asset) => {
          const stored = manualMap.get(asset.symbol);
          const quote = liveMap.get(asset.symbol);
          return (
            <Card key={asset.symbol} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Text variant="body" weight="semibold">{asset.name} <span className="text-foreground-tertiary">{asset.symbol}</span></Text>
                  <Text variant="caption" color="tertiary" className="mt-1 block">{asset.venue}</Text>
                </div>
                {quote ? (
                  <Badge variant={quote.provider === "MANUAL" ? "warning" : "success"}>
                    {quote.provider === "MOONXDEX" ? "MoonX DEX" : quote.provider}
                  </Badge>
                ) : (
                  <Badge variant="outline">未测试</Badge>
                )}
              </div>

              {quote ? (
                <div className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.03] px-3 py-2 text-sm">
                  自动/当前价格：<strong>{quote.price.toLocaleString("en-US", { maximumFractionDigits: 8 })}</strong>
                  <span className="ml-2 text-white/45">{quote.sourceSymbol} · {displayTime(quote.capturedAt)}</span>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
                <label className="space-y-1">
                  <span className="text-caption text-white/45">手动价格</span>
                  <input
                    inputMode="decimal"
                    value={values[asset.symbol] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [asset.symbol]: event.target.value }))}
                    placeholder="未填写"
                    className={fieldClass()}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-caption text-white/45">备注（可空）</span>
                  <input
                    value={notes[asset.symbol] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [asset.symbol]: event.target.value }))}
                    placeholder="例如：收盘价"
                    className={fieldClass()}
                  />
                </label>
                <div className="flex items-end">
                  <Button variant="ghost" disabled={loading || !stored} onClick={() => clearOne(asset.symbol)}>
                    清除
                  </Button>
                </div>
              </div>
              <Text variant="caption" color="tertiary" className="block">
                最近手动记录：{stored ? `${stored.price} · ${displayTime(stored.capturedAt)}` : "无"}
              </Text>
            </Card>
          );
        })}
      </div>

      {warnings.length ? (
        <Card padding="md" className="space-y-2 border-amber-400/15">
          <Text variant="body-sm" weight="semibold">本轮行情提示</Text>
          {warnings.slice(0, 20).map((warning, index) => (
            <Text key={`${warning}-${index}`} variant="caption" color="secondary" className="block">{warning}</Text>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
