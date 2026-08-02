import { redirect } from "next/navigation";
import { Section } from "@/components/ui";
import { MemberMonthlyPage } from "@/components/member/MemberMonthlyPage";
import { requireMember } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "月度行情 | MOOX Intelligence", description: "会员专享月度方向、运行路径与关键风险。" };

export default async function MonthlyPage() {
  const user = await requireMember();
  if (!user) redirect("/login?next=/member/monthly");
  return <main><Section spacing="lg"><MemberMonthlyPage /></Section></main>;
}
