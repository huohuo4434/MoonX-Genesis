// MOOX_V7206_MARKET_STRUCTURE_DESK
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { ConclusionFirstPanel, type ConclusionFirstFact } from "@/components/member/ConclusionFirstPanel";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { loadCryptoDerivativesDashboard } from "@/lib/market-data/crypto-derivatives-dashboard";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";
import { hasMarketStructureEvidence } from "@/lib/presentation/member-conclusion-summaries";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/market-structure";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "交易结构与多空数据 | MOOX",
    titleEn: "Market Structure & Positioning | MOOX",
    descriptionZh: "缠论结构、资金费率、持仓量和多空拥挤度。",
    descriptionEn: "Chan structure, funding, open interest and long/short positioning.",
  });
}

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return value.toLocaleString("en-US", { maximumFractionDigits: value < 10 ? 4 : 2 });
}
function percent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(4)}%`;
}
function ratio(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(2);
}

export default async function MarketStructurePage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main className="min-h-screen bg-[#07080a] text-white"><div className="mx-auto max-w-6xl px-4 py-12"><MemberDeviceGate decision={gate.device} nextPath={path} /></div></main>;

  const rows = await loadCryptoDerivativesDashboard().catch(() => []);
  const evidenceRows = rows.filter(hasMarketStructureEvidence);
  const structureFacts: ConclusionFirstFact[] = evidenceRows.slice(0, 4).map((row) => ({
    label: row.symbol,
    value: row.price !== null || row.chanConfirmation !== null || row.chanInvalidation !== null
      ? `${row.chanStageZh} · ${row.crowdingZh}`
      : `衍生品数据可用 · ${row.crowdingZh}`,
    tone: "neutral",
  }));
  return <main className="min-h-screen bg-[#07080a] text-white">
    <MemberDeviceHeartbeat />
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ConclusionFirstPanel
        eyebrow="会员实验数据台"
        headingLevel="h1"
        title="当前位置结论"
        conclusion={evidenceRows.length
          ? `已取得${evidenceRows.length}个市场的有效结构或衍生品字段。本页只判断位置和风险，不改变日报、周报已经锁定的正式方向。`
          : "行情源暂无可用数据，当前暂停结构判断，不使用旧值或假数据补齐。"}
        facts={structureFacts}
        actions={[
          "先看4H结构是否与正式方向同向。",
          "资金费率或多空比拥挤时降低执行优先级。",
          "确认位未突破或失效位已触发时继续等待。",
        ]}
      />

      <div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="text-xs tracking-[0.12em] text-white/45"><tr><th className="px-3 py-3">品种</th><th className="px-3 py-3">现价</th><th className="px-3 py-3">4H缠论</th><th className="px-3 py-3">资金费率</th><th className="px-3 py-3">持仓量 OI</th><th className="px-3 py-3">多空比</th><th className="px-3 py-3">拥挤判断</th><th className="px-3 py-3">关键位</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.symbol} className="border-t border-white/[0.07] align-top">
            <td className="px-3 py-4 font-semibold">{row.symbol}</td>
            <td className="px-3 py-4">{money(row.price)}</td>
            <td className="px-3 py-4"><div className="font-medium text-cyan-100">{row.chanStageZh}</div><div className="mt-1 max-w-[260px] text-xs leading-5 text-white/45">{row.chanStatusZh}</div></td>
            <td className="px-3 py-4">{percent(row.fundingRate)}</td>
            <td className="px-3 py-4">{money(row.openInterest)}</td>
            <td className="px-3 py-4">{ratio(row.longShortRatio)}</td>
            <td className="px-3 py-4 max-w-[220px] text-white/70">{row.crowdingZh}</td>
            <td className="px-3 py-4 text-xs leading-5 text-white/55">确认 {money(row.chanConfirmation)}<br/>失效 {money(row.chanInvalidation)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-6 text-white/35">强平热力图只有接入可靠的实时强平流后才展示；当前不把普通多空比伪装成“爆仓点位”。</p>
    </div>
  </main>;
}
