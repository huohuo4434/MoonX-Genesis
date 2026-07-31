import { redirect } from "next/navigation";

export const metadata = {
  title: "明日观点 | MOOX Intelligence",
  description: "明日观点已合并到首页，由系统自动生成并持续更新。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MemberTomorrowRoute() {
  redirect("/#tomorrow");
}
