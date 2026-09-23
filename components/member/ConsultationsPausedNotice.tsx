"use client";

import { Card, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PAYMENT_TELEGRAM } from "@/lib/operations/lean-policy";

export function ConsultationsPausedNotice() {
  const { locale } = useLocale();
  const en = locale === "en";
  return <Card padding="lg" className="space-y-3">
    <h1 className="text-xl font-semibold">{en ? "Online consultations are paused" : "在线咨询已暂停"}</h1>
    <Text variant="body-sm" color="secondary" className="block">{en ? "New requests and supplementary submissions are closed. Existing encrypted records and entitlement records are retained, not erased. Historical private content is not available on this page. Contact support about outstanding requests or existing benefits; do not resend sensitive personal details in Telegram." : "停止新申请及补充提交，既有加密记录和权益记录保留，不删除。历史私密内容暂不在本页展示。如有未完成申请或既有权益，请联系客服核查处理；不要在电报中重新发送敏感个人资料。"}</Text>
    <a href={PAYMENT_TELEGRAM.url} target="_blank" rel="noopener noreferrer" className="inline-block text-primary underline">Telegram {PAYMENT_TELEGRAM.handle}</a>
  </Card>;
}
