import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { runDailyVerification } from "@/lib/verification/run-daily";
import { z } from "zod";

const bodySchema = z
  .object({
    forceRefetchForecastIds: z.array(z.string()).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema> = {};
  try {
    const raw = await request.json().catch(() => ({}));
    body = bodySchema.parse(raw) ?? {};
  } catch {
    return NextResponse.json({ error: "无效参数" }, { status: 400 });
  }

  try {
    const report = await runDailyVerification({
      forceRefetchForecastIds: body?.forceRefetchForecastIds,
    });
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "验证失败" },
      { status: 500 }
    );
  }
}
