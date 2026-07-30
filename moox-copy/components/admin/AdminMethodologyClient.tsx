"use client";

import { useEffect, useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import type { MethodologyConfig, MethodologyModule } from "@/lib/methodology/types";

export function AdminMethodologyClient() {
  const [config, setConfig] = useState<MethodologyConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/methodology", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.ok) {
          setError(json?.error ?? "加载失败");
          return;
        }
        setConfig(json.config as MethodologyConfig);
      })
      .catch(() => {
        if (!cancelled) setError("加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveModule(mod: MethodologyModule) {
    setSavingId(mod.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/methodology", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mod.id,
          patch: {
            enabled: mod.enabled,
            publicDisplay: mod.publicDisplay,
            nameZh: mod.nameZh,
            nameEn: mod.nameEn,
            summaryZh: mod.summaryZh,
            summaryEn: mod.summaryEn,
            weightRangeZh: mod.weightRangeZh,
            weightRangeEn: mod.weightRangeEn,
          },
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.error ?? "保存失败");
        return;
      }
      setConfig(json.config as MethodologyConfig);
    } catch {
      setError("保存失败");
    } finally {
      setSavingId(null);
    }
  }

  function updateLocal(id: string, patch: Partial<MethodologyModule>) {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      };
    });
  }

  if (!config) {
    return (
      <Text variant="body-sm" color="secondary">
        {error ?? "加载预测方法配置…"}
      </Text>
    );
  }

  return (
    <div className="space-y-4">
      <Text variant="body-sm" color="secondary">
        控制公开「预测方法」页展示的模块。分析师情报在 `INTELLIGENCE_SNAPSHOT_ENABLED`
        未开启时会被系统强制隐藏。权重请填写区间或“根据历史验证动态调整”，不要写无来源的精确固定百分比。
      </Text>
      {error ? (
        <Text variant="caption" className="text-red-600">
          {error}
        </Text>
      ) : null}
      {config.modules.map((m) => (
        <Card key={m.id} padding="lg" className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={m.enabled}
                onChange={(e) => updateLocal(m.id, { enabled: e.target.checked })}
              />
              启用
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={m.publicDisplay}
                onChange={(e) => updateLocal(m.id, { publicDisplay: e.target.checked })}
              />
              公开展示
            </label>
            <Text variant="caption" color="tertiary">
              最后更新：{m.updatedAt}
            </Text>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-caption text-foreground-tertiary">
              中文名称
              <input
                className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
                value={m.nameZh}
                onChange={(e) => updateLocal(m.id, { nameZh: e.target.value })}
              />
            </label>
            <label className="block text-caption text-foreground-tertiary">
              English name
              <input
                className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
                value={m.nameEn}
                onChange={(e) => updateLocal(m.id, { nameEn: e.target.value })}
              />
            </label>
          </div>
          <label className="block text-caption text-foreground-tertiary">
            中文简介
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
              value={m.summaryZh}
              onChange={(e) => updateLocal(m.id, { summaryZh: e.target.value })}
            />
          </label>
          <label className="block text-caption text-foreground-tertiary">
            English summary
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
              value={m.summaryEn}
              onChange={(e) => updateLocal(m.id, { summaryEn: e.target.value })}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-caption text-foreground-tertiary">
              权重范围（中文）
              <input
                className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
                value={m.weightRangeZh}
                onChange={(e) => updateLocal(m.id, { weightRangeZh: e.target.value })}
              />
            </label>
            <label className="block text-caption text-foreground-tertiary">
              Weight range (EN)
              <input
                className="mt-1 w-full rounded-md border border-border/[0.12] bg-background px-3 py-2 text-body-sm"
                value={m.weightRangeEn}
                onChange={(e) => updateLocal(m.id, { weightRangeEn: e.target.value })}
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={savingId === m.id}
            onClick={() => void saveModule(m)}
          >
            {savingId === m.id ? "保存中…" : "保存此模块"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
