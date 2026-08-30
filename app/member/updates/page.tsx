import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { Section } from "@/components/ui";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import { MEMBER_UPDATE_NOTES, MEMBER_UPDATE_POLICY } from "@/lib/member-updates/catalog";
import { guardMemberForecastRoute } from "@/lib/route-feature-guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "版本升级公告 | MOOX Intelligence",
  description: "查看MOOX会员频道的大版本更新、入口变化和保留内容。",
};

export default async function MemberUpdatesPage() {
  noStore();
  guardMemberForecastRoute();
  const gate = await getMemberDevicePageAccess();
  if (gate.status === "LOGIN_REQUIRED") redirect("/login?next=/member/updates");
  if (gate.status === "MEMBERSHIP_REQUIRED") redirect("/pricing");
  if (gate.status === "DEVICE_REQUIRED") {
    return <main><Section spacing="lg"><MemberDeviceGate decision={gate.device} nextPath="/member/updates" /></Section></main>;
  }

  return (
    <>
      <MemberDeviceHeartbeat />
      <main className="min-h-screen bg-[#050509] text-white">
        <Section spacing="lg">
          <div className="mx-auto max-w-5xl">
            <Link href="/member" className="text-sm text-violet-300 hover:text-violet-200">← 返回会员频道</Link>
            <header className="mt-5 rounded-3xl border border-violet-300/15 bg-[radial-gradient(circle_at_85%_0%,rgba(124,92,255,.18),transparent_35%),rgba(255,255,255,.025)] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">MOOX VERSION UPDATES</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">版本升级公告</h1>
              <p className="mt-3 max-w-3xl leading-7 text-white/65">每次大更新都在这里说明改了什么、原来的入口搬到哪里、哪些内容没有删除。公告按发布时间倒序排列。</p>
            </header>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <h2 className="text-lg font-semibold">哪些更新会发公告</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {MEMBER_UPDATE_POLICY.map((item) => <span key={item} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60">{item}</span>)}
              </div>
            </section>

            <div className="mt-8 space-y-8">
              {MEMBER_UPDATE_NOTES.map((note, index) => (
                <article key={note.version} className="overflow-hidden rounded-3xl border border-amber-300/15 bg-white/[0.025]">
                  <div className="border-b border-white/10 p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.12em] text-amber-200">
                      {index === 0 ? <span className="rounded-full bg-amber-300/10 px-3 py-1">当前版本</span> : null}
                      <span>{note.version}</span><span className="text-white/25">·</span><time dateTime={note.releasedAt} className="text-white/45">{note.releasedAt}</time>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{note.title}</h2>
                    <p className="mt-3 max-w-4xl leading-7 text-white/65">{note.summary}</p>
                    <ul className="mt-5 grid gap-3 text-sm leading-6 text-white/75 md:grid-cols-2">
                      {note.highlights.map((item) => <li key={item} className="rounded-2xl bg-white/[0.035] p-4">✓ {item}</li>)}
                    </ul>
                  </div>

                  <div className="p-6 sm:p-8">
                    <h3 className="text-xl font-semibold">原来的入口现在在哪里</h3>
                    <div className="mt-4 grid gap-3">
                      {note.routeChanges.map((change) => (
                        <Link key={change.oldEntry} href={change.href} className="grid gap-2 rounded-2xl border border-white/10 bg-black/15 p-4 transition hover:border-violet-300/30 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <span><span className="block text-xs text-white/40">原入口</span><span className="mt-1 block text-sm text-white/75">{change.oldEntry}</span></span>
                          <span className="text-violet-300">→</span>
                          <span><span className="block text-xs text-white/40">现在从这里进入</span><strong className="mt-1 block text-violet-200">{change.newEntry}</strong><span className="mt-1 block text-xs leading-5 text-white/45">{change.note}</span></span>
                        </Link>
                      ))}
                    </div>

                    <h3 className="mt-7 text-xl font-semibold">本次没有改变</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                      {note.preserved.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Section>
      </main>
    </>
  );
}
