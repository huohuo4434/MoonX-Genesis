import "server-only";

import { cookies } from "next/headers";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getAccessUser } from "@/lib/auth/get-access-user";
import { hashDeviceToken, MEMBER_DEVICE_COOKIE } from "@/lib/auth/device-security";

/**
 * Per-instance abuse guard for paid APIs. The durable security boundary remains
 * the member-device guard; this limiter only blunts rapid scraping/spam.
 */
export async function checkMemberApiRateLimit(input: {
  scope: string;
  limit?: number;
  windowMs?: number;
}) {
  const access = await getAccessUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_DEVICE_COOKIE)?.value;
  const deviceKey = token ? hashDeviceToken(token).slice(0, 20) : "missing";
  const userKey = access.userId ?? "anonymous";
  return checkRateLimit(
    `member-api:${input.scope}:${userKey}:${deviceKey}`,
    input.limit ?? 120,
    input.windowMs ?? 60_000
  );
}
