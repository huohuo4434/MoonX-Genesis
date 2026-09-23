import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAutoPaymentActions } from "@/components/admin/AdminAutoPaymentActions";
import { AdminGoodwillUnderpaymentTool } from "@/components/admin/AdminGoodwillUnderpaymentTool";
import { AdminPaymentApproveActions } from "@/components/admin/AdminPaymentApproveActions";
import { Badge, Card, Heading, Section, Text } from "@/components/ui";
import { isPaymentEmailConfigured, isPaymentEmailProductionReady } from "@/lib/email/notifications";
import { MANUAL_PAYMENT_MODE } from "@/lib/operations/lean-policy";
import {
  getAutoPaymentUserEmailMap,
  isAutoPaymentMembershipActivated,
  isCompletedManualGoodwill,
  type AutoPaymentOrder,
} from "@/lib/payments/auto-payment-orders";
import { getPaymentConfig } from "@/lib/payments/config";
import { getAdminPaymentQueueSummary } from "@/lib/payments/admin-payment-summary";
import { formatDateTimeChina } from "@/lib/utils/datetime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function emailLabel(status?: string | null): string {
  if (status === "sent" || status === "email_sent") return "已发送";
  if (status === "email_failed") return "发送失败";
  return "未配置 / 未发送";
}

function automaticStatusBadge(order: AutoPaymentOrder) {
  if (isCompletedManualGoodwill(order)) return <Badge variant="success">少付特批已开通</Badge>;
  if (order.metadata.membershipGranted) return <Badge variant="warning">会员已开通，审计待补</Badge>;
  const status = order.status;
  if (status === "paid" || status === "overpaid") return <Badge variant="success">已全额开通</Badge>;
  if (status === "pending" || status === "verifying") return <Badge variant="warning">历史待处理（自动核验已停）</Badge>;
  if (status === "underpaid") return <Badge variant="danger">金额不足</Badge>;
  if (status === "manual_review") return <Badge variant="danger">人工复核</Badge>;
  if (status === "rejected") return <Badge variant="danger">核验未通过</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function legacyStatusBadge(status: string, isTest: boolean) {
  if (isTest) return <Badge variant="outline">系统测试</Badge>;
  if (status === "approved") return <Badge variant="success">已开通</Badge>;
  if (status === "rejected") return <Badge variant="danger">已拒绝</Badge>;
  return <Badge variant="warning">待审核</Badge>;
}

export default async function AdminPaymentsPage() {
  const paymentQueue = await getAdminPaymentQueueSummary(200);
  const { autoOrders, legacyOrders, autoAttention, autoProcessing, autoPaid, legacyPending, legacyApproved, legacyRejected, legacyTests: tests } = paymentQueue;
  const emailMap = await getAutoPaymentUserEmailMap(autoOrders.map((order) => order.userId));
  const cfg = getPaymentConfig();
  const emailConfigured = isPaymentEmailConfigured();
  const emailProductionReady = isPaymentEmailProductionReady();

  function renderAutoOrder(order: AutoPaymentOrder) {
    const buyerEmail = order.metadata.buyerEmail ?? emailMap.get(order.userId) ?? "未读取到邮箱";
    const paid = isAutoPaymentMembershipActivated(order);
    const canRetry = !MANUAL_PAYMENT_MODE && Boolean(order.txHash) && !paid;
    const canActivate = Boolean(order.txHash) && !paid && order.paidAmount != null && order.paidAmount >= order.expectedAmount;
    return (
      <Card key={order.id} padding="md" className="overflow-hidden border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="body-sm" weight="semibold">{buyerEmail}</Text>
          {automaticStatusBadge(order)}
          {order.founderRank ? <Badge variant="outline">创始会员 #{order.founderRank} · {100 - order.discountPercent}%价格</Badge> : null}
        </div>
        <div className="mt-3 grid gap-1 text-caption text-foreground-tertiary md:grid-cols-2">
          <p>订单号：{order.orderNumber}</p>
          <p>用户ID：{order.userId}</p>
          <p>套餐：{order.planName} · {order.durationDays}天</p>
          <p>网络：{order.network} / {order.chain}</p>
          <p>标价：{order.listPrice} USDT · 折扣：{order.discountPercent}%</p>
          <p>精确应付：{order.expectedAmount} USDT</p>
          <p>实际到账：{order.paidAmount ?? "—"} USDT</p>
          <p>创建时间：{formatDateTimeChina(order.createdAt)}</p>
          <p>哈希提交：{order.metadata.txSubmittedAt ? formatDateTimeChina(order.metadata.txSubmittedAt) : "—"}</p>
          <p>会员到期：{order.membershipExpiresAt ? formatDateTimeChina(order.membershipExpiresAt) : "—"}</p>
          <p>管理员邮件：{emailLabel(order.metadata.adminNotificationStatus)}</p>
          <p>最近邮件类型：{order.metadata.lastAdminNotificationKind ?? "—"}</p>
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block break-all font-mono">
          交易哈希：{order.txHash ?? "尚未提交"}
        </Text>
        {order.verificationError ? (
          <Text variant="caption" className="mt-2 block rounded-md border border-red-500/20 bg-red-500/[0.06] p-2 text-red-200/80">
            自动核验说明：{order.verificationError}
          </Text>
        ) : null}
        {order.metadata.adminNotificationError ? (
          <Text variant="caption" className="mt-2 block text-amber-200/80">
            邮件说明：{order.metadata.adminNotificationError}
          </Text>
        ) : null}
        <AdminAutoPaymentActions orderId={order.id} canRetry={canRetry} canActivate={canActivate} />
      </Card>
    );
  }

  function renderLegacyOrder(order: (typeof legacyOrders)[number], showActions: boolean) {
    return (
      <Card key={order.orderId} padding="md" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="body-sm" weight="semibold">{order.userEmail}</Text>
          {legacyStatusBadge(order.status, order.isTest)}
        </div>
        <Text variant="caption" color="tertiary" className="mt-2 block">订单号：{order.orderNumber}</Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">
          套餐：{order.planName} · 金额：{order.amount} USDT · 会员天数：{order.durationDays}天
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">支付网络：{order.network}</Text>
        <Text variant="caption" color="tertiary" className="mt-1 block break-all font-mono">交易哈希：{order.txHash}</Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">提交时间：{formatDateTimeChina(order.submittedAt)}</Text>
        <Text variant="caption" color="tertiary" className="mt-1 block">邮件通知：{emailLabel(order.notificationStatus)}</Text>
        {showActions ? (
          <AdminPaymentApproveActions orderId={order.orderId} userId={order.userId} txHash={order.txHash} network={order.network} />
        ) : null}
      </Card>
    );
  }

  return (
    <main>
      <Section spacing="lg">
        <AdminNav current="/admin/payments" pendingCount={paymentQueue.pendingCount} />
        <Heading as="h1" size="h2">人工付款与历史订单</Heading>

        <Card padding="md" className="mt-4 space-y-1 border border-cyan-500/20 bg-cyan-500/[0.04]">
          <Text variant="body-sm" weight="semibold">人工核验模式 · Telegram @jackuwin</Text>
          <Text variant="caption" color="tertiary" className="block">
            新付款通过电报联系，不自动创建订单、查账或开通。先在钱包或官方区块浏览器核实网络、代币合约、收款地址、实际金额和确认状态，再查历史订单及会员审计，确保未重复开通。
          </Text>
          <Text variant="caption" color="tertiary" className="block">
            新人工付款使用用户管理中的人工开通／续期入口，原因记录网络、TXID、实收金额和日期；结果不确定时核查后保留同一原因重试。人工调整不算自动订单收入，不自动分配创始资格或邀请奖励；相关权益请按既有规则逐项核对。旧订单保留，不要求用户重复付款。
          </Text>
        </Card>

        {!emailConfigured ? (
          <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Text variant="body-sm">邮件通知未配置。人工付款不依赖邮件服务，请通过电报确认处理结果；历史订单继续保留。</Text>
          </Card>
        ) : null}
        {emailConfigured && !emailProductionReady ? (
          <Card padding="md" className="mt-4 border border-amber-500/40 bg-amber-500/10">
            <Text variant="body-sm">Resend已配置，但正式发件域名尚未识别为 @mooxintel.com。请验证发件域名并设置 PAYMENT_EMAIL_FROM。</Text>
          </Card>
        ) : null}

        <Card padding="md" className="mt-4 mb-6 space-y-1">
          <Text variant="caption" color="tertiary" className="block break-all">TRC20：{cfg.trc20Address}</Text>
          <Text variant="caption" color="tertiary" className="block break-all">BEP20：{cfg.bep20Address}</Text>
        </Card>

        {!MANUAL_PAYMENT_MODE ? <Card padding="md" className="mb-8 space-y-3 border border-amber-400/25 bg-amber-400/[0.04]">
          <Text variant="body" weight="semibold">少付手续费客服特批</Text>
          <Text variant="caption" color="tertiary" className="block">
            独立处理已过期、尚未绑定哈希或未出现在当前异常列表的订单。这里只提交复核请求；服务端仍会权威核验收款地址、USDT 合约、原订单时间窗、唯一尾号和真实到账金额。
          </Text>
          <AdminGoodwillUnderpaymentTool />
        </Card> : null}

        <Heading as="h2" size="h3">自动订单·需要处理（{autoAttention.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {autoAttention.length ? autoAttention.map(renderAutoOrder) : <Text variant="body-sm" color="secondary">当前没有异常自动付款。</Text>}
        </div>

        <Heading as="h2" size="h3" className="mt-8">历史自动订单·待人工核查（{autoProcessing.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {autoProcessing.length ? autoProcessing.map(renderAutoOrder) : <Text variant="body-sm" color="secondary">当前没有核验中的订单。</Text>}
        </div>

        <Heading as="h2" size="h3" className="mt-8">自动订单·已开通（{autoPaid.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {autoPaid.length ? autoPaid.slice(0, 60).map(renderAutoOrder) : <Text variant="body-sm" color="secondary">暂无自动开通记录。</Text>}
        </div>

        <Heading as="h2" size="h3" className="mt-10">旧版人工付款队列</Heading>
        <Text variant="body-sm" color="secondary" className="mt-2">仅兼容历史订单；新人工付款不进入自动订单队列。处理前务必比对实际到账和会员审计记录。</Text>

        <Heading as="h3" size="h3" className="mt-6">待审核（{legacyPending.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {legacyPending.length ? legacyPending.map((order) => renderLegacyOrder(order, true)) : <Text variant="body-sm" color="secondary">当前没有旧版待审核付款。</Text>}
        </div>

        <Heading as="h3" size="h3" className="mt-8">已开通（{legacyApproved.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {legacyApproved.length ? legacyApproved.map((order) => renderLegacyOrder(order, false)) : <Text variant="body-sm" color="secondary">暂无旧版已开通付款。</Text>}
        </div>

        <Heading as="h3" size="h3" className="mt-8">已拒绝（{legacyRejected.length}）</Heading>
        <div className="mt-3 flex flex-col gap-3">
          {legacyRejected.length ? legacyRejected.map((order) => renderLegacyOrder(order, false)) : <Text variant="body-sm" color="secondary">暂无旧版已拒绝付款。</Text>}
        </div>

        {tests.length ? (
          <>
            <Heading as="h3" size="h3" className="mt-8">系统测试（{tests.length}）</Heading>
            <div className="mt-3 flex flex-col gap-3">{tests.map((order) => renderLegacyOrder(order, order.status === "pending"))}</div>
          </>
        ) : null}
      </Section>
    </main>
  );
}
