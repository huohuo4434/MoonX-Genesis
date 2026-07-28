"use client";

import { useEffect, useState } from "react";
import { Button, Card, Text } from "@/components/ui";
import { useLocale, useTranslations } from "@/lib/i18n/LocaleProvider";

type InvitePayload = {
  inviteCode: string;
  inviteLink: string;
  successCount: number;
  rewardDaysTotal: number;
  rewardDaysPerSuccess: number;
};

export function AccountReferralPanel() {
  const t = useTranslations();
  const { locale } = useLocale();
  const [data, setData] = useState<InvitePayload | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/referral", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.inviteCode) {
          setError(locale.startsWith("zh") ? "暂无法加载邀请信息" : "Unable to load invite info");
          return;
        }
        setData(json as InvitePayload);
      })
      .catch(() => {
        if (!cancelled) setError(locale.startsWith("zh") ? "暂无法加载邀请信息" : "Unable to load invite info");
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function copy(kind: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card padding="lg" className="mt-6 max-w-lg space-y-3">
      <Text variant="body" weight="semibold">
        {t("referral.title")}
      </Text>
      <Text variant="body-sm" color="secondary">
        {t("referral.subtitle")}
      </Text>

      {error ? (
        <Text variant="caption" className="text-red-600">
          {error}
        </Text>
      ) : null}

      {!data ? (
        <Text variant="caption" color="tertiary">
          {t("referral.loading")}
        </Text>
      ) : (
        <>
          <div>
            <Text variant="caption" color="tertiary" className="block">
              {t("referral.myCode")}
            </Text>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Text variant="body" weight="semibold" className="font-mono tracking-wider">
                {data.inviteCode}
              </Text>
              <Button type="button" size="sm" variant="outline" onClick={() => void copy("code", data.inviteCode)}>
                {copied === "code" ? t("referral.copied") : t("referral.copy")}
              </Button>
            </div>
          </div>

          <div>
            <Text variant="caption" color="tertiary" className="block">
              {t("referral.myLink")}
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-1 break-all">
              {data.inviteLink}
            </Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => void copy("link", data.inviteLink)}
            >
              {copied === "link" ? t("referral.copied") : t("referral.copyLink")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-md border border-border/[0.1] px-3 py-2">
              <Text variant="caption" color="tertiary" className="block">
                {t("referral.successCount")}
              </Text>
              <Text variant="body" weight="semibold">
                {data.successCount} {t("referral.people")}
              </Text>
            </div>
            <div className="rounded-md border border-border/[0.1] px-3 py-2">
              <Text variant="caption" color="tertiary" className="block">
                {t("referral.rewardTotal")}
              </Text>
              <Text variant="body" weight="semibold">
                {data.rewardDaysTotal} {t("referral.days")}
              </Text>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
