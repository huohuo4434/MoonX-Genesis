import { NextResponse } from "next/server";

/** Auto chain verify disabled — admins approve via /admin/payments. */
export async function POST() {
  return NextResponse.json(
    { error: "自动核验已停用，请等待管理员人工审核。" },
    { status: 410 }
  );
}
