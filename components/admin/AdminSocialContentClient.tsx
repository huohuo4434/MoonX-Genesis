"use client";

import { useState } from "react";
import { Badge, Button, Card, Text } from "@/components/ui";
import type { SocialCardRecord } from "@/types/social-card";

export function AdminSocialContentClient({
  initialToday,
  initialHistory,
  forecastDate,
}: {
  initialToday: SocialCardRecord[];
  initialHistory: SocialCardRecord[];
  forecastDate: string;
}) {
  const [today, setToday] = useState(initialToday);
  const [history, setHistory] = useState(initialHistory);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        count?: number;
        cards?: SocialCardRecord[];
        forecastDate?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "重新生成失败");
      setToday(json.cards ?? []);
      setMessage(`已重新生成 ${json.count ?? 0} 张卡片（${json.forecastDate ?? forecastDate}）`);
      const refresh = await fetch("/api/admin/social-cards?date=today", { cache: "no-store" });
      if (refresh.ok) {
        const data = (await refresh.json()) as {
          today: SocialCardRecord[];
          history: SocialCardRecord[];
        };
        setToday(data.today);
        setHistory(data.history);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新生成失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={regenerate}>
          {busy ? "生成中…" : "重新生成今日卡片"}
        </Button>
        <Text variant="body-sm" color="secondary">
          尺寸统一 1200×675（X / Telegram / 网站）· 仅公开营销字段
        </Text>
      </div>
      {message ? (
        <Text variant="body-sm" className="text-emerald-500">
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text variant="body-sm" className="text-red-500">
          {error}
        </Text>
      ) : null}

      <section>
        <Text variant="body" weight="semibold" className="mb-3 block">
          今日生成卡片 · {forecastDate}
        </Text>
        {today.length === 0 ? (
          <Card padding="lg" className="border-border/[0.08]">
            <Text variant="body-sm" color="secondary">
              今日尚无卡片。可点击重新生成，或等待北京时间 00:10 定时任务。
            </Text>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {today.map((card) => (
              <Card key={card.id} padding="md" className="border-border/[0.08] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="body-sm" weight="semibold">
                    {card.payload.assetName} · {card.payload.symbol}
                  </Text>
                  <Badge variant="outline">{card.status}</Badge>
                </div>
                <Text variant="caption" color="tertiary">
                  {card.payload.direction} · {card.payload.probability}
                </Text>
                <Text variant="body-sm" color="secondary">
                  {card.payload.summary}
                </Text>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageUrl}
                  alt={`${card.payload.assetName} social card`}
                  width={1200}
                  height={675}
                  className="h-auto w-full rounded-md border border-border/[0.08]"
                />
                <Text variant="caption" color="tertiary">
                  来源 {card.source} · 更新 {card.updatedAt}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <Text variant="body" weight="semibold" className="mb-3 block">
          历史卡片
        </Text>
        {history.length === 0 ? (
          <Text variant="body-sm" color="secondary">
            暂无历史记录。
          </Text>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 40).map((card) => (
              <div
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/[0.08] px-3 py-2"
              >
                <div>
                  <Text variant="body-sm">
                    {card.forecastDate} · {card.payload.assetName} · {card.payload.direction}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    {card.id}
                  </Text>
                </div>
                <a
                  href={card.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-primary underline-offset-2 hover:underline"
                >
                  查看图片
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
