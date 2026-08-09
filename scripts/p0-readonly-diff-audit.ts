/**
 * Read-only P0 consistency audit.
 * Never mutates payment, membership, verification or LIVE state.
 * Output is written under reports/ for administrator review before any migration.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { listPaymentOrders } from "@/lib/payments/payment-orders-store";
import { listAllAutoPaymentOrders } from "@/lib/payments/auto-payment-orders";
import { listMembershipEvents } from "@/lib/auth/membership-events";
import { getAdminClient } from "@/lib/supabase/admin";
import { getVerificationPipelineStatus } from "@/lib/accuracy/verification-pipeline-status";
import { getPublicVerificationSnapshot } from "@/lib/accuracy/public-verification-snapshot";
import { loadProductionEnv } from "@/scripts/load-env";

function maskId(value: string): string {
  const text = String(value || "");
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

async function listAuthUsers() {
  const admin = getAdminClient();
  if (!admin) return [];
  const users = [] as Array<{ id: string; active: boolean; expiresAt: string | null; plan: string | null }>;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    for (const user of data.users) {
      const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
      const expiresAt = typeof meta.membership_expires_at === "string" ? meta.membership_expires_at : null;
      const active = meta.membership_status === "active" && Boolean(expiresAt && Date.parse(expiresAt) > Date.now());
      users.push({
        id: user.id,
        active,
        expiresAt,
        plan: typeof meta.membership_plan === "string" ? meta.membership_plan : null,
      });
    }
    if (data.users.length < 100) break;
  }
  return users;
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

async function main() {
  loadProductionEnv();
  const generatedAt = new Date().toISOString();
  const [legacyOrders, autoOrders, events, authUsers, verification, publicSnapshot] = await Promise.all([
    listPaymentOrders(),
    listAllAutoPaymentOrders(500),
    listMembershipEvents({ limit: 5000 }),
    listAuthUsers(),
    getVerificationPipelineStatus(),
    getPublicVerificationSnapshot(),
  ]);

  const activeUsers = authUsers.filter((row) => row.active);
  const pendingLegacy = legacyOrders.filter((row) => row.status === "pending" && !row.isTest);
  const autoActionRequired = autoOrders.filter((row) => ["manual_review", "underpaid", "rejected", "expired"].includes(row.status));
  const autoPending = autoOrders.filter((row) => ["pending", "verifying"].includes(row.status));
  const completedLike = autoOrders.filter((row) => ["paid", "overpaid"].includes(row.status));

  const paymentEventSources = new Set(
    events.filter((event) => event.eventType === "PAYMENT_APPROVED").map((event) => event.sourceId)
  );
  const completedWithoutLedger = completedLike
    .filter((order) => !paymentEventSources.has(order.id))
    .map((order) => ({ orderId: order.id, userId: maskId(order.userId), status: order.status }));

  const eventsByUser = new Map<string, typeof events>();
  for (const event of events) {
    const rows = eventsByUser.get(event.userId) ?? [];
    rows.push(event);
    eventsByUser.set(event.userId, rows);
  }
  const rapidAdminGrants: Array<{ userId: string; first: string; second: string; minutes: number }> = [];
  for (const [userId, rows] of eventsByUser) {
    const adminRows = rows
      .filter((row) => row.eventType === "ADMIN_ADJUSTMENT" && row.daysChanged > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let index = 1; index < adminRows.length; index += 1) {
      const first = adminRows[index - 1]!;
      const second = adminRows[index]!;
      const minutes = (Date.parse(second.createdAt) - Date.parse(first.createdAt)) / 60_000;
      if (minutes >= 0 && minutes <= 15) {
        rapidAdminGrants.push({ userId: maskId(userId), first: first.id, second: second.id, minutes: Math.round(minutes * 10) / 10 });
      }
    }
  }

  const report = {
    generatedAt,
    readOnly: true,
    payment: {
      legacyTotal: legacyOrders.length,
      legacyPending: pendingLegacy.length,
      autoTotal: autoOrders.length,
      autoStatusCounts: countBy(autoOrders.map((row) => row.status)),
      autoPending: autoPending.length,
      autoActionRequired: autoActionRequired.length,
      completedWithoutMatchingPaymentLedgerEvent: completedWithoutLedger,
    },
    membership: {
      authUsers: authUsers.length,
      activeMembers: activeUsers.length,
      membershipEvents: events.length,
      rapidAdminGrants,
    },
    verification: {
      pipeline: verification,
      publicDaily: publicSnapshot.daily.items.length,
      publicWeekly: publicSnapshot.weekly.items.length,
      publicPending: publicSnapshot.pending.length,
    },
    migrationAllowed: false,
    nextStep: "Review this report before any write migration that changes membership duration, founder discount, payment status or verification history.",
  };

  const reportDir = path.join(process.cwd(), "reports");
  await fs.mkdir(reportDir, { recursive: true });
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(reportDir, `MOOX_P0_READONLY_AUDIT_${stamp}.json`);
  const mdPath = path.join(reportDir, `MOOX_P0_READONLY_AUDIT_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# MOOX P0 只读差异报告",
    "",
    `生成时间：${generatedAt}`,
    "",
    "> 本报告只读。没有修改会员期限、付款状态、优惠资格、验证历史或 LIVE 状态。",
    "",
    "## 付款 / 会员",
    "",
    `- 旧订单总数：${legacyOrders.length}`,
    `- 旧订单待处理：${pendingLegacy.length}`,
    `- 自动订单总数：${autoOrders.length}`,
    `- 自动订单状态：${JSON.stringify(report.payment.autoStatusCounts)}`,
    `- 自动订单 pending/verifying：${autoPending.length}`,
    `- 自动订单需人工关注：${autoActionRequired.length}`,
    `- Auth 用户：${authUsers.length}`,
    `- 当前有效会员：${activeUsers.length}`,
    `- 会员流水：${events.length}`,
    `- 15分钟内连续管理员加期疑点：${rapidAdminGrants.length}`,
    `- paid/overpaid 但未找到同 order id PAYMENT_APPROVED 流水：${completedWithoutLedger.length}`,
    "",
    "## 公开验证",
    "",
    `- verification pipeline records：${verification.verificationRecords}`,
    `- pipeline pending：${verification.pending}`,
    `- pipeline completed：${verification.completed}`,
    `- pipeline excluded：${verification.excluded}`,
    `- pipeline syncMissing：${verification.syncMissing}`,
    `- public daily：${publicSnapshot.daily.items.length}`,
    `- public weekly：${publicSnapshot.weekly.items.length}`,
    `- public pending：${publicSnapshot.pending.length}`,
    "",
    "## 写入迁移",
    "",
    "**未执行。** 下一步应由管理员先确认这份差异报告，再单独生成可回滚的迁移包。",
    "",
  ].join("\n");
  await fs.writeFile(mdPath, md, "utf8");

  console.log("MOOX P0 READ-ONLY AUDIT COMPLETE");
  console.log(mdPath);
  console.log(jsonPath);
}

main().catch((error) => {
  console.error("MOOX P0 READ-ONLY AUDIT FAILED");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
