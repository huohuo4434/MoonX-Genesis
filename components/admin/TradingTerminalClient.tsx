"use client";

import { FormEvent, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@/components/ui";
import type { TradeSignalRecord } from "@/types/trading-signal";
import type {
  PaperEquitySnapshot,
  TradeSignalAction,
  TradingV2Snapshot,
} from "@/types/trading-v2";

const inputClass =
  "min-h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary/60";

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isoFromLocal(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function money(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function stars(level: number): string {
  return `${"★".repeat(Math.max(0, Math.min(5, level)))}${"☆".repeat(
    Math.max(0, 5 - level)
  )}`;
}

function EquityCurve({ rows }: { rows: PaperEquitySnapshot[] }) {
  const points = useMemo(() => {
    if (!rows.length) return "";
    const values = rows.map((row) => row.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    return rows
      .map((row, index) => {
        const x = rows.length === 1 ? 0 : (index / (rows.length - 1)) * 100;
        const y = 100 - ((row.equity - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [rows]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4">
      <Text variant="body-sm" weight="semibold">
        模拟账户净值曲线
      </Text>
      <svg viewBox="0 0 100 100" className="mt-3 h-44 w-full" preserveAspectRatio="none">
        <polyline
          points={points || "0,50 100,50"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Text variant="caption" className="block text-white/40">
        只记录模拟成交和人工价格检查，不使用虚构价格。
      </Text>
    </div>
  );
}

function WorkflowGuide({ snapshot }: { snapshot: TradingV2Snapshot }) {
  const readyDrafts = snapshot.drafts.filter((item) => item.readiness.ready).length;
  const armedSignals = snapshot.actionableSignals.filter((item) =>
    ["ARMED", "TRIGGERED", "ACTIVE", "TAKE_PROFIT"].includes(item.status)
  ).length;
  const steps = [
    {
      number: 1,
      title: "保存风控",
      detail: "先确认单笔亏损、星级仓位和暂停纪律。",
      href: "#step-risk",
      state: "可随时修改",
    },
    {
      number: 2,
      title: "生成草稿",
      detail: "从正式预测生成模拟交易草稿。",
      href: "#step-generate",
      state: snapshot.drafts.length ? `已有${snapshot.drafts.length}条` : "尚未生成",
    },
    {
      number: 3,
      title: "补齐交易计划",
      detail: "填写入场、止损、目标、有效期并保存。",
      href: "#step-review",
      state: readyDrafts ? `${readyDrafts}条可执行` : "等待补齐",
    },
    {
      number: 4,
      title: "进入等待触发",
      detail: "草稿资料完整后，点击“进入等待触发”。",
      href: "#step-review",
      state: armedSignals ? `${armedSignals}条监控中` : "尚未触发",
    },
    {
      number: 5,
      title: "检查并模拟执行",
      detail: "输入真实价格，系统按止盈止损纪律模拟执行。",
      href: "#step-monitor",
      state: armedSignals ? "按钮已开放" : "等待第4步",
    },
  ];

  return (
    <Card padding="lg" className="border-primary/25 bg-primary/[0.04]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading size="h3">模拟交易操作导航</Heading>
          <Text variant="body-sm" color="secondary" className="mt-1 block">
            按1到5依次操作。没有完成前一步时，后面的按钮不会出现或不能点击。
          </Text>
        </div>
        <Badge variant="outline">仅模拟盘</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step) => (
          <a
            key={step.number}
            href={step.href}
            className="rounded-lg border border-white/10 bg-black/15 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {step.number}
              </span>
              <span className="text-caption text-amber-200/80">{step.state}</span>
            </div>
            <Text variant="body-sm" weight="semibold" className="mt-3 block">
              {step.title}
            </Text>
            <Text variant="caption" color="tertiary" className="mt-1 block leading-relaxed">
              {step.detail}
            </Text>
          </a>
        ))}
      </div>
    </Card>
  );
}

export function TradingTerminalClient({
  initial,
}: {
  initial: TradingV2Snapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/trading-v2", { cache: "no-store" });
    const json = (await res.json()) as TradingV2Snapshot & { error?: string };
    if (!res.ok) throw new Error(json.error || "刷新失败");
    setSnapshot(json);
  }

  async function request(
    url: string,
    method: "POST" | "PATCH" | "PUT",
    body?: Record<string, unknown>
  ) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: { message?: string };
      };
      if (!res.ok || json.error) throw new Error(json.error || "操作失败");
      await refresh();
      setMessage(json.result?.message || "操作完成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function generateDrafts() {
    await request("/api/admin/trading-v2/generate-drafts", "POST");
  }

  async function saveRisk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request("/api/admin/trading-v2/risk", "PUT", {
      riskPerTradePct: Number(data.get("riskPerTradePct")),
      maxPositionPct: Number(data.get("maxPositionPct")),
      star1PositionPct: Number(data.get("star1PositionPct")),
      star2PositionPct: Number(data.get("star2PositionPct")),
      star3PositionPct: Number(data.get("star3PositionPct")),
      star4PositionPct: Number(data.get("star4PositionPct")),
      star5PositionPct: Number(data.get("star5PositionPct")),
      dailyLossStopPct: Number(data.get("dailyLossStopPct")),
      maxConsecutiveLosses: Number(data.get("maxConsecutiveLosses")),
      breakevenAfterTarget1: data.get("breakevenAfterTarget1") === "on",
      target1ClosePct: Number(data.get("target1ClosePct")),
      target2ClosePct: Number(data.get("target2ClosePct")),
    });
  }

  async function setInitialCash() {
    const raw = window.prompt("输入模拟账户初始资金（美元）", String(snapshot.account.initialCash));
    if (!raw) return;
    const initialCash = Number(raw);
    if (!Number.isFinite(initialCash) || initialCash < 1000) {
      setMessage("初始资金至少为1000");
      return;
    }
    await request("/api/admin/trading-v2/account", "POST", { initialCash });
  }

  async function saveDraft(
    event: FormEvent<HTMLFormElement>,
    signal: TradeSignalRecord
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await request(`/api/admin/trading-v2/signals/${signal.id}`, "PATCH", {
      entryMode: String(data.get("entryMode")),
      entryLow: numberOrNull(data.get("entryLow")),
      entryHigh: numberOrNull(data.get("entryHigh")),
      triggerPrice: numberOrNull(data.get("triggerPrice")),
      stopLoss: numberOrNull(data.get("stopLoss")),
      stopConfirmTimeframe: String(data.get("stopConfirmTimeframe")),
      target1: numberOrNull(data.get("target1")),
      target2: numberOrNull(data.get("target2")),
      target3: numberOrNull(data.get("target3")),
      starLevel: Number(data.get("starLevel")),
      consensusScore: Number(data.get("consensusScore")),
      validFrom: isoFromLocal(data.get("validFrom")),
      validUntil: isoFromLocal(data.get("validUntil")),
      rationale: String(data.get("rationale") || ""),
      executionPlan: String(data.get("executionPlan") || ""),
      invalidation: String(data.get("invalidation") || ""),
      revisionReason: "管理员在量化终端完善交易计划",
    });
  }

  async function action(signal: TradeSignalRecord, next: TradeSignalAction) {
    let price: number | null = null;
    let confirmed = false;
    if (
      ["TRIGGER", "ENTER", "TARGET1", "TARGET2", "TARGET3", "STOP", "CLOSE"].includes(
        next
      )
    ) {
      const raw = window.prompt("输入实际价格");
      if (!raw) return;
      price = Number(raw);
      if (!Number.isFinite(price) || price <= 0) {
        setMessage("价格无效");
        return;
      }
    }
    if (next === "STOP" && signal.stopConfirmTimeframe !== "INTRADAY") {
      confirmed = window.confirm(
        `是否已经满足${signal.stopConfirmTimeframe}收盘确认？未确认将只生成警报，不会退出。`
      );
    }
    await request(
      `/api/admin/trading-v2/signals/${signal.id}/action`,
      "POST",
      { action: next, price, confirmed }
    );
  }

  async function monitor(signal: TradeSignalRecord, execute: boolean) {
    const raw = window.prompt("输入当前价格");
    if (!raw) return;
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) {
      setMessage("价格无效");
      return;
    }
    const confirmed = window.confirm(
      "若触及止损，是否已经满足4小时或日线收盘确认？"
    );
    await request(
      `/api/admin/trading-v2/signals/${signal.id}/monitor`,
      "POST",
      { price, confirmed, execute }
    );
  }

  const openPositions = snapshot.positions.filter(
    (position) => position.status !== "CLOSED"
  );
  const openAlerts = snapshot.alerts.filter((alert) => !alert.resolved);

  return (
    <div className="space-y-8">
      {message ? (
        <Card padding="md" className="border-primary/30 bg-primary/[0.05]">
          <Text variant="body-sm">{message}</Text>
        </Card>
      ) : null}

      <WorkflowGuide snapshot={snapshot} />

      <section className="grid gap-3 md:grid-cols-4">
        <Card padding="md">
          <Text variant="caption" color="tertiary">账户净值</Text>
          <Heading size="h3">${money(snapshot.account.currentEquity)}</Heading>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">已实现盈亏</Text>
          <Heading size="h3">${money(snapshot.account.realizedPnl)}</Heading>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">最大回撤</Text>
          <Heading size="h3">{snapshot.account.maxDrawdownPct.toFixed(2)}%</Heading>
        </Card>
        <Card padding="md">
          <Text variant="caption" color="tertiary">当前持仓</Text>
          <Heading size="h3">{openPositions.length}</Heading>
        </Card>
      </section>

      <Card id="step-generate" padding="lg" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Heading size="h3">第2步：从正式预测生成草稿</Heading>
            <Text variant="body-sm" color="secondary" className="mt-1 block">
              七大市场读取最近日度和周度预测；重点关注读取最近周度预测。只有明确方向才生成，全部先进入草稿。
            </Text>
          </div>
          <Button onClick={generateDrafts} isLoading={loading}>
            从正式预测生成草稿
          </Button>
        </div>
        <Text variant="caption" className="block text-amber-200">
          自动草稿不会进入API、不会建立仓位，也不会计入收益。管理员补齐价位并审核后才能执行。
        </Text>
      </Card>

      <section id="step-risk" className="scroll-mt-24 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card padding="lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Heading size="h3">第1步：保存全局风险纪律</Heading>
            <Badge variant="outline">
              {snapshot.account.paused ? "账户已暂停" : "允许模拟开仓"}
            </Badge>
          </div>
          <form onSubmit={saveRisk} className="grid gap-3 md:grid-cols-2">
            {[
              ["riskPerTradePct", "单笔最大亏损%", snapshot.riskSettings.riskPerTradePct],
              ["maxPositionPct", "单资产最大仓位%", snapshot.riskSettings.maxPositionPct],
              ["star1PositionPct", "一星仓位%", snapshot.riskSettings.star1PositionPct],
              ["star2PositionPct", "二星仓位%", snapshot.riskSettings.star2PositionPct],
              ["star3PositionPct", "三星仓位%", snapshot.riskSettings.star3PositionPct],
              ["star4PositionPct", "四星仓位%", snapshot.riskSettings.star4PositionPct],
              ["star5PositionPct", "五星仓位%", snapshot.riskSettings.star5PositionPct],
              ["dailyLossStopPct", "单日止损线%", snapshot.riskSettings.dailyLossStopPct],
              ["maxConsecutiveLosses", "连续亏损暂停次数", snapshot.riskSettings.maxConsecutiveLosses],
              ["target1ClosePct", "目标1减仓%", snapshot.riskSettings.target1ClosePct],
              ["target2ClosePct", "目标2减仓%", snapshot.riskSettings.target2ClosePct],
            ].map(([name, label, value]) => (
              <label key={String(name)} className="space-y-1 text-xs text-white/45">
                {label}
                <input
                  className={inputClass}
                  name={String(name)}
                  type="number"
                  step="any"
                  defaultValue={Number(value)}
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="breakevenAfterTarget1"
                defaultChecked={snapshot.riskSettings.breakevenAfterTarget1}
              />
              达到目标1后，剩余仓位止损自动移至成本价
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" isLoading={loading}>保存风控</Button>
              <Button type="button" variant="outline" onClick={setInitialCash}>
                设置初始资金
              </Button>
            </div>
          </form>
        </Card>
        <EquityCurve rows={snapshot.equityCurve} />
      </section>

      <section id="step-review" className="scroll-mt-24 space-y-4">
        <Heading size="h3">第3—4步：补齐交易计划并进入等待触发</Heading>
        {snapshot.drafts.map((signal) => (
          <Card key={signal.id} padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">
                  {signal.assetName} · {signal.symbol}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  {signal.timeframe} · {signal.direction} · V{signal.version}
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{stars(signal.starLevel)}</Badge>
                <Badge variant="outline">{signal.consensusScore}分</Badge>
                <Badge variant={signal.readiness.ready ? "success" : "warning"}>
                  {signal.readiness.ready
                    ? "可发布"
                    : `缺少：${signal.readiness.missing.join("、")}`}
                </Badge>
              </div>
            </div>

            <form onSubmit={(event: FormEvent<HTMLFormElement>) => saveDraft(event, signal)} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <select className={inputClass} name="entryMode" defaultValue={signal.entryMode}>
                  <option value="BREAKOUT">突破触发</option>
                  <option value="BUY_ZONE">买入区间</option>
                  <option value="PULLBACK">回踩入场</option>
                  <option value="MARKET">市价</option>
                  <option value="MANUAL">人工确认</option>
                </select>
                {[
                  ["entryLow", "入场下沿", signal.entryLow],
                  ["entryHigh", "入场上沿", signal.entryHigh],
                  ["triggerPrice", "触发价", signal.triggerPrice],
                  ["stopLoss", "止损价", signal.stopLoss],
                  ["target1", "目标1", signal.target1],
                  ["target2", "目标2", signal.target2],
                  ["target3", "目标3", signal.target3],
                ].map(([name, label, value]) => (
                  <input
                    key={String(name)}
                    className={inputClass}
                    name={String(name)}
                    type="number"
                    step="any"
                    placeholder={String(label)}
                    defaultValue={value == null ? "" : Number(value)}
                  />
                ))}
                <select
                  className={inputClass}
                  name="stopConfirmTimeframe"
                  defaultValue={signal.stopConfirmTimeframe}
                >
                  <option value="4H">4小时确认止损</option>
                  <option value="1D">日线确认止损</option>
                  <option value="INTRADAY">盘中立即止损</option>
                </select>
                <label className="space-y-1 text-xs text-white/45">
                  星级
                  <input
                    className={inputClass}
                    name="starLevel"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue={signal.starLevel}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  共识分
                  <input
                    className={inputClass}
                    name="consensusScore"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={signal.consensusScore}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  有效开始
                  <input
                    className={inputClass}
                    name="validFrom"
                    type="datetime-local"
                    defaultValue={localDateTime(signal.validFrom)}
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  有效截止
                  <input
                    className={inputClass}
                    name="validUntil"
                    type="datetime-local"
                    defaultValue={localDateTime(signal.validUntil)}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <textarea
                  className={`${inputClass} min-h-28`}
                  name="rationale"
                  defaultValue={signal.rationale}
                  placeholder="信号依据"
                />
                <textarea
                  className={`${inputClass} min-h-28`}
                  name="executionPlan"
                  defaultValue={signal.executionPlan}
                  placeholder="执行计划"
                />
                <textarea
                  className={`${inputClass} min-h-28`}
                  name="invalidation"
                  defaultValue={signal.invalidation}
                  placeholder="判断错误的退出条件"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" isLoading={loading}>保存草稿</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!signal.readiness.ready}
                  onClick={() => action(signal, "PUBLISH")}
                >
                  发布并锁定
                </Button>
                <Button
                  type="button"
                  disabled={!signal.readiness.ready}
                  onClick={() => action(signal, "ARM")}
                >
                  进入等待触发
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => action(signal, "CANCEL")}
                >
                  取消草稿
                </Button>
              </div>
            </form>
          </Card>
        ))}
        {!snapshot.drafts.length ? (
          <Card padding="lg">
            <Text variant="body-sm" color="secondary">
              暂无草稿。先到上方第1步保存风控，再点击第2步“从正式预测生成草稿”。
            </Text>
          </Card>
        ) : null}
      </section>

      <section id="step-monitor" className="scroll-mt-24 space-y-4">
        <Heading size="h3">第5步：检查价格并模拟执行</Heading>
        {snapshot.actionableSignals.map((signal) => (
          <Card key={signal.id} padding="lg" className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Text variant="body" weight="semibold">
                  {signal.assetName} · {signal.symbol}
                </Text>
                <Text variant="caption" color="tertiary" className="mt-1 block">
                  入场 {signal.entryLow ?? "—"}—{signal.entryHigh ?? "—"} ·
                  触发 {signal.triggerPrice ?? "—"} · 止损 {signal.stopLoss ?? "—"}
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{signal.status}</Badge>
                <Badge variant="outline">{signal.direction}</Badge>
                <Badge variant="outline">{stars(signal.starLevel)}</Badge>
              </div>
            </div>
            <Text variant="body-sm" className="block text-white/70">
              {signal.executionPlan || signal.rationale}
            </Text>
            <div className="flex flex-wrap gap-2">
              {signal.status === "PUBLISHED" ? (
                <Button size="sm" onClick={() => action(signal, "ARM")}>等待触发</Button>
              ) : null}
              {["ARMED", "ACTIVE", "TAKE_PROFIT"].includes(signal.status) ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => monitor(signal, false)}>
                    检查价格
                  </Button>
                  <Button size="sm" onClick={() => monitor(signal, true)}>
                    检查并模拟执行
                  </Button>
                </>
              ) : null}
              {["ACTIVE", "TAKE_PROFIT"].includes(signal.status) ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => action(signal, "MOVE_STOP_BREAKEVEN")}>
                    止损移至成本
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => action(signal, "STOP")}>
                    执行止损
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => action(signal, "CLOSE")}>
                    人工平仓
                  </Button>
                </>
              ) : null}
              {["PUBLISHED", "ARMED", "TRIGGERED"].includes(signal.status) ? (
                <Button size="sm" variant="danger" onClick={() => action(signal, "CANCEL")}>
                  取消
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
        {!snapshot.actionableSignals.length ? (
          <Card padding="lg">
            <Text variant="body-sm" color="secondary">
              暂无等待触发的信号。第3步补齐入场、止损和目标后，点击“进入等待触发”，这里才会出现“检查并模拟执行”。
            </Text>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <Heading size="h3">当前模拟持仓</Heading>
          {openPositions.map((position) => (
            <Card key={position.id} padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Text variant="body-sm" weight="semibold">
                  {position.assetName} · {position.symbol}
                </Text>
                <Badge variant="outline">{position.status}</Badge>
              </div>
              <Text variant="body-sm" className="block text-white/70">
                {position.direction} · 数量 {position.remainingQuantity.toFixed(6)} /
                {position.originalQuantity.toFixed(6)} · 成本 {position.averageEntryPrice}
              </Text>
              <Text variant="body-sm" className={position.unrealizedPnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                浮动盈亏 ${money(position.unrealizedPnl)} · 已实现 ${money(position.realizedPnl)}
              </Text>
            </Card>
          ))}
          {!openPositions.length ? (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">暂无模拟持仓。</Text>
            </Card>
          ) : null}
        </div>

        <div className="space-y-3">
          <Heading size="h3">纪律提醒</Heading>
          {openAlerts.map((alert) => (
            <Card key={alert.id} padding="md" className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Text variant="body-sm" weight="semibold">{alert.message}</Text>
                <Badge variant={alert.severity === "CRITICAL" ? "danger" : "outline"}>
                  {alert.severity}
                </Badge>
              </div>
              <Text variant="caption" className="block text-amber-200">
                必须执行：{alert.actionRequired}
              </Text>
            </Card>
          ))}
          {!openAlerts.length ? (
            <Card padding="md">
              <Text variant="body-sm" color="secondary">暂无未处理提醒。</Text>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <Heading size="h3">最近模拟订单</Heading>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.03] text-white/45">
              <tr>
                <th className="p-3">时间</th>
                <th className="p-3">类型</th>
                <th className="p-3">方向</th>
                <th className="p-3">数量</th>
                <th className="p-3">价格</th>
                <th className="p-3">金额</th>
                <th className="p-3">说明</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.orders.slice(0, 30).map((order) => (
                <tr key={order.id} className="border-t border-white/5">
                  <td className="p-3">{new Date(order.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="p-3">{order.orderType}</td>
                  <td className="p-3">{order.side}</td>
                  <td className="p-3">{order.quantity.toFixed(6)}</td>
                  <td className="p-3">{order.price}</td>
                  <td className="p-3">${money(order.notional)}</td>
                  <td className="p-3 text-white/55">{order.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
