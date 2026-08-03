"use client";

import { Heading, Text } from "@/components/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function CheckoutIntro() {
  const { locale } = useLocale();
  const en = locale === "en";
  return (
    <>
      <Heading as="h1" size="h2">{en ? "Automatic membership checkout" : "会员自动结账"}</Heading>
      <Text variant="body-sm" color="secondary">
        {en
          ? "Generate an order, transfer the exact amount and submit the transaction hash. Confirmed payments activate membership automatically."
          : "生成订单后按精确金额转账并提交交易哈希，链上确认后自动开通会员。"}
      </Text>
    </>
  );
}
