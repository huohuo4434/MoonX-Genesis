import "server-only";

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/membership";

/** Accept session admin OR WAVE_ADMIN_KEY header (module API key). */
export async function authorizeWaveAdmin(req: NextRequest): Promise<boolean> {
  const key = process.env.WAVE_ADMIN_KEY?.trim();
  if (key && req.headers.get("x-admin-key") === key) return true;
  const admin = await requireAdmin();
  return Boolean(admin);
}
