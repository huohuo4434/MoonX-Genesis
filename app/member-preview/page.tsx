import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_PREVIEW_COOKIE } from "@/lib/access/member-preview";
import { Button, Card, Section, Text } from "@/components/ui";

async function enablePreview(formData: FormData) {
  "use server";
  const key = process.env.MOONX_MEMBER_PREVIEW_KEY;
  if (!key || formData.get("previewKey") !== key) redirect("/member-preview?error=1");
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_PREVIEW_COOKIE, key, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  redirect("/research/technical");
}

async function disablePreview() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_PREVIEW_COOKIE);
  redirect("/member-preview");
}

export default function MemberPreviewPage() {
  return (
    <main><Section spacing="lg"><Card padding="lg" className="mx-auto flex max-w-md flex-col gap-4">
      <Text variant="label" color="secondary">MOONX MEMBER PREVIEW</Text>
      <Text variant="body" weight="semibold">会员预览</Text>
      <Text variant="body-sm" color="secondary">仅供站长在配置服务端预览口令后检查会员内容；不会创建用户或购买权限。</Text>
      <form action={enablePreview} className="flex flex-col gap-3">
        <input name="previewKey" type="password" required className="h-10 rounded-md border border-border bg-surface px-3" aria-label="Preview key" />
        <Button type="submit">进入会员预览</Button>
      </form>
      <form action={disablePreview}><Button type="submit" variant="ghost">退出会员预览</Button></form>
    </Card></Section></main>
  );
}
