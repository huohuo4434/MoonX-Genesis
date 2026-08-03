"use client";

import { Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function CheckoutIntro() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <>
      <Heading as="h1" size="h2">{en ? "Membership checkout" : "会员结账"}</Heading>
      <Text variant="body-sm" color="secondary">
        {en ? "Transfer USDT, then submit the transaction hash for manual activation." : "转账后提交交易哈希，管理员审核开通。"}
      </Text>
    </>
  );
}
