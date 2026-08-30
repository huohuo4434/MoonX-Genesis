import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberConsultationClient } from "@/components/member/MemberConsultationClient";
import { MemberUpdateNotice } from "@/components/member/MemberUpdateNotice";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { MEMBER_VIDEO_CATALOG } from "@/lib/member-videos/catalog";
import { LATEST_MEMBER_UPDATE } from "@/lib/member-updates/catalog";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberConsultationsPage() {
  noStore();
  guardMemberForecastRoute();
  const gate = await getMemberDevicePageAccess();

  if (gate.status === "LOGIN_REQUIRED") redirect("/login?next=/member/consultations");
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") {
    return (
      <main>
        <Section spacing="lg">
          <MemberDeviceGate decision={gate.device} nextPath="/member/consultations" />
        </Section>
      </main>
    );
  }

  return (
    <>
      <MemberDeviceHeartbeat />
      <main>
        <Section spacing="lg" className="mx-auto max-w-3xl">
          <section className="mb-6 flex flex-col gap-4 rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(124,92,255,.18),transparent_42%),rgba(255,255,255,.035)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">会员内容</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                会员视频 · {MEMBER_VIDEO_CATALOG.length}期
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/60">
                查看全部深度视频，并在两期内容之间直接切换。
              </p>
            </div>
            <Link
              href="/member/videos"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              查看全部视频 →
            </Link>
          </section>
          <div className="mb-6">
            <MemberUpdateNotice note={LATEST_MEMBER_UPDATE} compact />
          </div>
          <MemberConsultationClient />
        </Section>
      </main>
    </>
  );
}
