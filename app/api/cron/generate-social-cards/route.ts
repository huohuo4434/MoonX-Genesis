import { NextResponse, type NextRequest } from "next/server";
import { generateSocialCardsForToday } from "@/lib/social-cards/generate";
function authorizeCron(request: NextRequest): boolean { const secret=process.env.CRON_SECRET; return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`); }
function wait(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let lastError="social card generation failed";
  for (let attempt=1; attempt<=2; attempt+=1) {
    try { const result=await generateSocialCardsForToday({ source: "cron" }); return NextResponse.json({ ok:true, attempt, forecastDate:result.forecastDate, count:result.count, cardIds:result.cards.map((card)=>card.id) }); }
    catch (error) { lastError=error instanceof Error ? error.message : String(error); if (attempt<2) await wait(900); }
  }
  console.error("[social-cards-cron] failed after retry", lastError);
  return NextResponse.json({ ok:false, error:lastError, retried:true }, { status:500 });
}
