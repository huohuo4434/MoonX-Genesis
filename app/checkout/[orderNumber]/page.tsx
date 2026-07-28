import { redirect } from "next/navigation";

export default async function LegacyCheckoutRedirect({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await params;
  redirect("/pricing");
}
