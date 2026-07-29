import { redirect } from "next/navigation";
import { AccountReferralPanel } from "@/components/account/AccountReferralPanel";
import { Heading, Section, Text } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "我的邀请 | MOOX" };

export default async function AccountInvitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/invite");

  return (
    <main>
      <Section spacing="lg">
        <Heading as="h1" size="h2">
          我的邀请
        </Heading>
        <Text variant="body-sm" color="secondary" className="mt-2 max-w-lg">
          邀请好友加入 MOOX，双方各赠送 7 天会员时间。
        </Text>
        <AccountReferralPanel />
      </Section>
    </main>
  );
}
