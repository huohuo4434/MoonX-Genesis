import "server-only";

import { listAllAuthUsers, updateUserAppMetadata } from "@/lib/auth/permissions";

/** Soft-disable table-backed membership activation. Use app_metadata APIs instead. */
export async function activateMembershipForOrder(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "已停用：请使用管理员审核开通会员" };
}

export async function extendMembershipFromPlan(): Promise<never> {
  throw new Error("已停用：请使用 /api/admin/users/membership");
}

/** Mark expired active members in app_metadata. */
export async function expireMemberships(): Promise<number> {
  const users = await listAllAuthUsers();
  const now = Date.now();
  let count = 0;
  for (const user of users) {
    if (user.app_metadata.role === "admin") continue;
    if (user.app_metadata.membership_status !== "active") continue;
    const exp = user.app_metadata.membership_expires_at;
    if (!exp || new Date(exp).getTime() > now) continue;
    await updateUserAppMetadata(user.id, {
      membership_status: "expired",
    });
    count += 1;
  }
  return count;
}
