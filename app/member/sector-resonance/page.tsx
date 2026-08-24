import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { SectorResonanceBoard } from "@/components/conviction/SectorResonanceBoard";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { buildSectorResonanceBoard } from "@/lib/data/conviction/sector-resonance-board";
import { buildLocalizedPageMetadata, getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const path = "/member/sector-resonance";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildLocalizedPageMetadata({
    locale,
    basePath: path,
    titleZh: "板块共振分析 | MOOX",
    titleEn: "Sector Resonance | MOOX",
    descriptionZh: "把重点资产按板块和自然周对齐，直观看同向共振与分化。",
    descriptionEn: "Compare priority assets by sector and aligned weekly windows.",
  });
}

export default async function MemberSectorResonancePage() {
  noStore();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect(`/login?next=${path}`);
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath={path} /></Section></main>;
  }
  const board = buildSectorResonanceBoard();
  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#07080a] text-white">
        <Section spacing="lg">
          <div className="mx-auto w-full max-w-[1480px]">
            <SectorResonanceBoard {...board} />
          </div>
        </Section>
      </main>
    </>
  );
}

