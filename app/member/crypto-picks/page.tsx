import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Badge, Heading, Section, Text } from "@/components/ui";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberRecommendationList } from "@/components/conviction/MemberRecommendationList";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { getConvictionListPagePayload } from "@/lib/data/conviction/access";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/crypto-picks";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "会员加密货币研究 | MOOX",
    titleEn: "Member Crypto Research | MOOX",
    descriptionZh: "会员加密货币方向、研究优先级、风险和多周期研究入口。",
    descriptionEn: "Member crypto directions, research priority, risk and multi-horizon research.",
  });
}

export default async function MemberCryptoPicksPage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;

  const payload = await getConvictionListPagePayload();
  return <>
    <MemberDeviceHeartbeat />
    <main className="min-h-screen bg-[#07080a] text-white">
      <Section spacing="lg">
        <div className="mx-auto w-full max-w-[1180px]">
          <Badge variant="default">会员专享</Badge>
          <Heading as="h1" size="h2" className="mt-4 text-white">加密货币推荐</Heading>
          <Text variant="body" className="mt-2 block max-w-3xl text-white/58">先看当前方向；感兴趣再进入标的看周期、关键时间和失效条件。</Text>
          <div className="mt-5"><MemberRecommendationList payload={payload} kind="CRYPTO" /></div>
          <details className="mt-5 rounded-xl border border-white/10 bg-white/[.02] p-4 text-xs text-white/50">
            <summary className="cursor-pointer font-medium text-white/60">展开评级与风险说明</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1.5">A+ 核心跟踪</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">A 重点跟踪</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">A− 高波动观察</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">B 实验观察</span>
              <span className="rounded-full border border-emerald-300/20 px-3 py-1.5 text-emerald-100">BTC/ETH 风险中</span>
              <span className="rounded-full border border-amber-300/20 px-3 py-1.5 text-amber-100">SOL/HYPE 风险高</span>
              <span className="rounded-full border border-rose-300/20 px-3 py-1.5 text-rose-100">太空狗 风险极高</span>
            </div>
          </details>
        </div>
      </Section>
    </main>
  </>;
}
