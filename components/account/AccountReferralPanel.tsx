"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [membershipRequired, setMembershipRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/referral/me", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (r.status === 401) {
          setError(locale.startsWith("zh") ? "请先登录" : "Please sign in");
          return;
        }
        if (json?.error === "MEMBERSHIP_REQUIRED" || r.status === 403) {
          setMembershipRequired(true);
          return;
        }
        if (!json?.ok || !json?.inviteCode) {
          setError(
            json?.message ||
              (locale.startsWith("zh") ? "暂无法加载邀请信息" : "Unable to load invite info")
          );
          return;
        }
        setData({
          inviteCode: json.inviteCode ?? json.referralCode,
          inviteLink: json.inviteLink ?? json.referralUrl,
          successCount: json.successCount ?? json.successfulInvites ?? 0,
          rewardDaysTotal: json.rewardDaysTotal ?? json.rewardDays ?? 0,
          rewardDaysPerSuccess: json.rewardDaysPerSuccess ?? 30,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(locale.startsWith("zh") ? "暂无法加载邀请信息" : "Unable to load invite info");
        }
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

      {membershipRequired ? (
        <div className="space-y-3">
          <Text variant="body-sm" color="secondary">
            {locale === "en" ? "Activate membership to receive your referral link." : "开通会员后获得邀请链接"}
          </Text>
          <Button asChild size="sm">
            <Link href="/pricing">{locale === "en" ? "Activate membership" : "开通会员"}</Link>
          </Button>
        </div>
      ) : null}

      {!membershipRequired && !error && !data ? (
        <Text variant="caption" color="tertiary">
          {t("referral.loading")}
        </Text>
      ) : null}

      {data ? (
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
              {copied === "link" ? (locale === "en" ? "Referral link copied" : "邀请链接已复制") : t("referral.copyLink")}
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
      ) : null}
    </Card>
  );
}
