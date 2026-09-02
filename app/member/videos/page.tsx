import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import {
  getMemberVideoRecord,
  MEMBER_VIDEO_CATALOG,
  type MemberVideoRecord,
} from "@/lib/member-videos/catalog";
import { getMemberVideoMemberSummary } from "@/lib/member-videos/member-content.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function HexagramCover({ video }: { video: MemberVideoRecord }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.28),transparent_35%),linear-gradient(145deg,#100b1f,#030407_70%)]">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute left-[8%] top-1/2 w-28 -translate-y-1/2 space-y-2 opacity-70 sm:w-40 sm:space-y-3">
        {[0, 1, 2, 3, 4, 5].map((line) => (
          <div key={line} className="flex h-2 gap-2 sm:h-3">
            {line === 2 || line === 5 ? (
              <>
                <span className="w-[44%] rounded-full bg-amber-200" />
                <span className="w-[44%] rounded-full bg-amber-200" />
              </>
            ) : (
              <span className="w-full rounded-full bg-amber-200" />
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-[42%] right-[7%] flex flex-col justify-center">
        <p className="text-xs font-medium tracking-[0.22em] text-violet-200 sm:text-sm">
          MOOX 会员深度视频
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-4xl">
          {video.title}
        </h2>
        <p className="mt-4 text-xs text-white/55 sm:text-sm">
          {video.durationLabel} · {video.subtitleLanguages.includes("en") ? "中英双字幕" : "中文字幕"}
        </p>
      </div>
    </div>
  );
}

type PageProps = {
  searchParams?: Promise<{ video?: string | string[] }>;
};

export default async function MemberVideosPage({ searchParams }: PageProps) {
  noStore();
  const params = await searchParams;
  const requestedSlug = Array.isArray(params?.video) ? params.video[0] : params?.video;
  const video = getMemberVideoRecord(requestedSlug ?? "") ?? MEMBER_VIDEO_CATALOG[0]!;
  const gate = await getMemberDevicePageAccess({ failClosed: true });
  const memberSummary = getMemberVideoMemberSummary(video.slug);
  const allowed = gate.status === "ALLOWED";

  return (
    <main className="min-h-screen bg-[#050509] px-4 py-10 text-white sm:px-6">
      {allowed ? <MemberDeviceHeartbeat /> : null}
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium tracking-[0.2em] text-violet-300">会员视频</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{video.title}</h1>
        <p className="mt-2 text-sm text-white/50">发布于 {video.publishedAt} · {video.durationLabel}</p>

        <div className="mt-7">
          {allowed ? (
            <video
              key={video.slug}
              className="aspect-video w-full rounded-2xl border border-white/10 bg-black shadow-2xl shadow-violet-950/30"
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              preload="metadata"
            >
              <source src={`/api/member/videos/${video.slug}`} type="video/mp4" />
              <track
                default
                kind="subtitles"
                label="中文字幕"
                src={`/api/member/videos/${video.slug}?asset=subtitle`}
                srcLang="zh-CN"
              />
              {video.subtitleLanguages.includes("en") ? (
                <track
                  kind="subtitles"
                  label="English"
                  src={`/api/member/videos/${video.slug}?asset=subtitleEn`}
                  srcLang="en"
                />
              ) : null}
              当前浏览器不支持视频播放。
            </video>
          ) : (
            <HexagramCover video={video} />
          )}
        </div>

        {allowed ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">本期内容</h2>
            <p className="mt-2 leading-7 text-white/70">{memberSummary}</p>
            <p className="mt-3 text-xs text-white/40">播放链接会定时失效，重新打开本页即可续签。</p>
          </section>
        ) : gate.status === "DEVICE_REQUIRED" ? (
          <div className="mt-6">
            <MemberDeviceGate decision={gate.device} nextPath={`/member/videos?video=${video.slug}`} />
          </div>
        ) : (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">会员专享内容</h2>
              <p className="mt-1 text-sm text-white/55">普通访客可查看标题，会员登录后播放完整视频。</p>
            </div>
            <Link
              href={gate.status === "LOGIN_REQUIRED" ? `/login?next=/member/videos?video=${video.slug}` : "/pricing"}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-500 px-5 text-sm font-semibold text-white"
            >
              {gate.status === "LOGIN_REQUIRED" ? "会员登录" : "查看会员方案"}
            </Link>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-violet-300">全部视频</p>
              <h2 className="mt-2 text-2xl font-semibold">选择一期观看</h2>
            </div>
            <p className="text-xs text-white/40">共 {MEMBER_VIDEO_CATALOG.length} 期</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {MEMBER_VIDEO_CATALOG.map((item) => {
              const active = item.slug === video.slug;
              return (
                <Link
                  key={item.slug}
                  href={`/member/videos?video=${item.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl border p-4 transition ${
                    active
                      ? "border-violet-300/45 bg-violet-400/10"
                      : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-xs text-white/45">
                    {item.publishedAt} · {item.durationLabel}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
