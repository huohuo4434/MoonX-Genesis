import { redirect } from "next/navigation";
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
    redirect(`${en ? "/en" : ""}/login?next=${encodeURIComponent(path)}`);
  const previewOnly = !access.isActiveMember && !access.isAdmin;
  if (!previewOnly) {
    const gate = await getMemberDevicePageAccess({ failClosed: true });
    if (gate.status !== "ALLOWED")
      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <MemberDeviceGate decision={gate.device} nextPath={path} />
        </main>
      );
  }
  return (
    <main>
      {!previewOnly && <MemberDeviceHeartbeat />}
      <MemberNotesClient
        en={en}
        isAdmin={access.isAdmin}
        previewOnly={previewOnly}
      />
    </main>
  );
}
