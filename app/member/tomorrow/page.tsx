import { redirect } from "next/navigation";

export const metadata = {
  title: "明日观点 | MOOX Intelligence",
  description: "下一交易日方向、概率、运行路径与关键价位。",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MemberTomorrowRoute() {
  redirect("/#tomorrow");
}
