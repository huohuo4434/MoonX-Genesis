import Link from "next/link";
import { PublicNotes } from "@/components/member/PublicNotes";
import { CreatorProfile } from "@/components/community/CreatorProfile";
import { MemberDeviceGate } from "@/components/access/MemberDeviceGate";
import { MemberDeviceHeartbeat } from "@/components/access/MemberDeviceHeartbeat";
import { MemberNotesClient } from "@/components/member/MemberNotesClient";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { getMemberDevicePageAccess } from "@/lib/auth/member-device-guard";
import {
  buildLocalizedPageMetadata,
  getRequestLocale,
} from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata() {
  return buildLocalizedPageMetadata({
    locale: await getRequestLocale(),
    basePath: "/member/notes",
    titleZh: "易老师随笔",
    titleEn: "Teacher Yi's Notes",
    descriptionZh: "个人见解、市场观察与会员讨论。",
    descriptionEn: "Personal observations and conversations with members.",
    index: false,
  });
}
export default async function MemberNotesPage() {
  const [access, locale] = await Promise.all([
    getAccessUser(),
    getRequestLocale(),
  ]);
  const en = locale === "en";
  const path = en ? "/en/member/notes" : "/member/notes";
  if (!access.authenticated)
    return <main><CreatorProfile en={en} compact /><section id="member-posts" className="mx-auto max-w-4xl scroll-mt-24 px-5 py-10 text-sm text-white/65"><h2 className="mb-3 text-xl font-semibold text-white">{en ? "Member journal" : "会员专栏"}</h2>{en ? "Sign in to access member posts and discussions. Public posts below are free to read." : "登录后可进入会员随笔与讨论。下方公开观点无需登录即可阅读。"}<Link className="ml-2 inline-block py-3 text-emerald-300 underline" href={`${en ? "/en" : ""}/login?next=${encodeURIComponent(path)}`}>{en ? "Sign in / Register" : "登录 / 注册"}</Link></section><PublicNotes /></main>;
  const previewOnly = !access.isActiveMember && !access.isAdmin;
  if (!previewOnly) {
    const gate = await getMemberDevicePageAccess({ failClosed: true });
    if (gate.status !== "ALLOWED")
      return (
        <main>
          <CreatorProfile en={en} compact />
          <div id="member-posts" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-10">
          <MemberDeviceGate decision={gate.device} nextPath={path} />
          </div>
          <PublicNotes />
        </main>
      );
  }
  return (
    <main>
      <CreatorProfile en={en} compact />
      {!previewOnly && <MemberDeviceHeartbeat />}
      <MemberNotesClient
        en={en}
        isAdmin={access.isAdmin}
        previewOnly={previewOnly}
      />
      <PublicNotes />
    </main>
  );
}
