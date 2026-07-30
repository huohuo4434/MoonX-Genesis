import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/permissions";
import { getAutomationDashboard, runMoonxCycle } from "@/lib/automation/cycle";
import { generateTomorrowForecasts } from "@/lib/automation/generate-forecasts";
import { generateReviewsForVerified } from "@/lib/automation/generate-reviews";
import { runDailyVerification } from "@/lib/verification/run-daily";
import { getAutomationSettings, saveAutomationSettings } from "@/lib/data/moonx-data-store";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  const [dashboard, settings] = await Promise.all([getAutomationDashboard(), getAutomationSettings()]);
  return NextResponse.json({ ok: true, dashboard, settings });
}

const patchSchema = z.object({
  autoForecastEnabled: z.boolean().optional(),
  autoPublishEnabled: z.boolean().optional(),
  autoVerifyEnabled: z.boolean().optional(),
  autoReviewEnabled: z.boolean().optional(),
  autoLearningEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }
  const settings = await saveAutomationSettings(body);
  return NextResponse.json({ ok: true, settings });
}

const postSchema = z.object({
  action: z.enum([
    "run_cycle",
    "generate_tomorrow",
    "verify_closed",
    "generate_reviews",
    "retry_failed",
  ]),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "无权限" }, { status: 403 });
  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  if (body.action === "run_cycle") {
    const report = await runMoonxCycle();
    return NextResponse.json({ ok: true, report });
  }
  if (body.action === "generate_tomorrow") {
    const report = await generateTomorrowForecasts();
    return NextResponse.json({ ok: true, report });
  }
  if (body.action === "verify_closed") {
    const report = await runDailyVerification();
    return NextResponse.json({ ok: true, report });
  }
  if (body.action === "generate_reviews" || body.action === "retry_failed") {
    const report = await generateReviewsForVerified();
    return NextResponse.json({ ok: true, report });
  }
  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
