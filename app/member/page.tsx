import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Access is checked by the destination page and its API, not by navigation.
export default async function MemberChannelPage() {
  const en = (await getRequestLocale()) === "en";
  redirect(`${en ? "/en" : ""}/member/notes#member-posts`);
}
