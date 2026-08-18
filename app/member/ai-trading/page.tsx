import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function LegacyAiTradingRedirect() { redirect("/member/live-trading"); }
