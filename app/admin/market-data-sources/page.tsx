import { AdminNav } from "@/components/admin/AdminNav";
import { Button, Card, Heading, Section, Text } from "@/components/ui";
import { loadCoreCryptoSourceHealth } from "@/lib/market-data/multi-source-crypto";
import { countPendingPaymentOrders } from "@/lib/payments/payment-orders-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

const PROVIDER_LABELS = {
  BINANCE_SPOT: "Binance现货",
  OKX_SPOT: "OKX现货",
  BITGET_FUTURES: "Bitget合约",
} as const;

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "暂无";
  return value.toLocaleString("en-US", { maximumFractionDigits: value >= 100 ? 2 : 5 });
}

export default async function AdminMarketDataSourcesPage() {
  const [report, pending] = await Promise.all([
    loadCoreCryptoSourceHealth({ symbols: ["BTC", "ETH", "SOL", "HYPE"], timeframe: "5m", timeoutMs: 4_000 }),
    countPendingPaymentOrders(),
  ]);
  return <main><Section spacing="lg">
    <AdminNav current="/admin/market-data-sources" pendingCount={pending} />
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Heading as="h1" size="h2">多源行情诊断</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">检查Binance、OKX、Bitget的闭合K线、价格偏差和可用性；只读，不触发交易。</Text></div><Button asChild variant="outline"><a href="/api/admin/market-data-sources">下载诊断JSON</a></Button></div>
    <div className="mt-6 space-y-4">{report.rows.map((row) => <Card key={row.symbol} padding="lg"><div className="flex flex-wrap items-center justify-between gap-3"><div><Heading as="h2" size="h3">{row.symbol}</Heading><Text variant="body-sm" color="secondary" className="mt-1 block">质量：{row.provenance.quality === "GOOD" ? "多源一致" : row.provenance.quality === "DEGRADED" ? "降级可用" : "阻断精确点位"} · 偏差 {row.provenance.divergencePct?.toFixed(4) ?? "—"}%</Text></div><span className="rounded-full border border-border px-3 py-1 text-xs">选用 {row.provenance.selectedProvider ? PROVIDER_LABELS[row.provenance.selectedProvider] : "无"}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3">{row.provenance.sources.map((source) => <div key={source.provider} className="rounded-xl border border-border/[.1] p-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{PROVIDER_LABELS[source.provider]}</b><span>{source.status === "HEALTHY" ? "正常" : source.status === "DEGRADED" ? "降级" : "失败"}</span></div><div className="mt-2 text-foreground-secondary">K线 {source.candleCount} · 价格 {formatPrice(source.latestPrice)}</div><div className="mt-1 text-xs text-foreground-tertiary">延迟 {source.latencyMs} ms{source.errorCode ? ` · ${source.errorCode}` : ""}</div></div>)}</div></Card>)}</div>
    <Card padding="lg" className="mt-6"><Text variant="body-sm"><b>治理边界：</b>行情源健康、资金费率、持仓量和主动买卖量只负责执行确认与风险过滤，不能覆盖已经锁定的周卦、月卦和正式方向。</Text></Card>
  </Section></main>;
}
