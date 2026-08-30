"use client";

import { useState } from "react";
import Link from "next/link";

type AdminLink = {
  href: string;
  label: string;
};

const primaryLinks: AdminLink[] = [
  { href: "/admin", label: "概览" },
  { href: "/admin/forecasts", label: "今日／明日" },
  { href: "/admin/weekly", label: "周度行情" },
  { href: "/admin/stocks", label: "重点关注" },
  { href: "/admin/trading-terminal", label: "模拟交易" },
  { href: "/admin/forecast-control", label: "研究中心" },
  { href: "/admin/users", label: "用户与会员" },
  { href: "/admin/automation", label: "自动化" },
  { href: "/admin/site-health", label: "网站诊断" },
  { href: "/admin/settings", label: "设置" },
];

const moreGroups: Array<{ label: string; links: AdminLink[] }> = [
  {
    label: "预测与交易",
    links: [
      { href: "/admin/trading-signals", label: "AI交易信号中心" },
      { href: "/admin/bitget-demo", label: "Bitget模拟执行" },
      { href: "/admin/market-prices", label: "行情录入" },
      { href: "/admin/market-data-sources", label: "多源行情诊断" },
      { href: "/admin/support-resistance", label: "支撑压力录入" },
      { href: "/admin/full-cycle", label: "全周期／关键日" },
      { href: "/admin/btc-eth-cycle", label: "BTC／ETH周期" },
    ],
  },
  {
    label: "研究资料",
    links: [
      { href: "/admin/external-viewpoints", label: "外部观点库" },
      { href: "/admin/asset-research", label: "资产材料导入" },
      { href: "/admin/ai-committee", label: "AI研究委员会" },
      { href: "/admin/qimen-shadow", label: "奇门影子A/B" },
      { href: "/admin/vibe-evidence", label: "Vibe客观证据" },
      { href: "/admin/iching/library", label: "六爻研究库" },
      { href: "/admin/teacher-knowledge", label: "老师知识库" },
      { href: "/admin/iching/rules", label: "老师投资六爻规则" },
      { href: "/admin/iching/cases", label: "六爻历史案例" },
      { href: "/admin/iching/validation", label: "六爻验证" },
      { href: "/admin/intelligence", label: "内部资料库" },
      { href: "/admin/wave", label: "波浪分析" },
      { href: "/admin/learning", label: "复盘学习" },
      { href: "/admin/methodology", label: "预测方法配置" },
    ],
  },
  {
    label: "会员与运营",
    links: [
      { href: "/admin/member-videos", label: "会员视频" },
      { href: "/admin/security", label: "会员设备安全" },
      { href: "/admin/membership-events", label: "会员流水" },
      { href: "/admin/payments", label: "支付记录" },
      { href: "/admin/referrals", label: "邀请管理" },
      { href: "/admin/consultations", label: "会员咨询复核" },
      { href: "/admin/social", label: "Social Content" },
    ],
  },
];

function AdminLinkItem({
  link,
  current,
}: {
  link: AdminLink;
  current?: string;
}) {
  const active =
    current === link.href ||
    (link.href !== "/admin" && Boolean(current?.startsWith(`${link.href}/`)));
  return (
    <Link
      href={link.href}
      className={`relative min-h-11 rounded-md px-3 py-2 text-body-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground-secondary hover:bg-muted hover:text-foreground"
      }`}
    >
      {link.label}
    </Link>
  );
}

export function AdminNav({
  current,
}: {
  current?: string;
  pendingCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const moreActive = moreGroups.some((group) =>
    group.links.some(
      (link) =>
        current === link.href ||
        (link.href !== "/admin" && Boolean(current?.startsWith(`${link.href}/`)))
    )
  );

  return (
    <>
      <div className="mb-6 border-b border-border/[0.08] pb-4">
        <button
          type="button"
          className="mb-2 inline-flex min-h-11 items-center rounded-md border border-border/[0.12] px-3 text-body-sm text-foreground-secondary md:hidden"
          aria-expanded={open}
          aria-controls="admin-side-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "收起后台菜单" : "展开后台菜单"}
        </button>

        <nav
          id="admin-side-nav"
          className={`${open ? "flex" : "hidden"} flex-col gap-3 md:flex`}
        >
          <div className="flex flex-wrap gap-2">
            {primaryLinks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-card/40 px-5 py-10 text-center">
          <div className="text-base font-semibold text-foreground">暂无咨询申请</div>
          <div className="mt-2 text-sm text-foreground-secondary">会员在「会员六爻/八字咨询」提交后会出现在这里。</div>
        </div>
      ) : null}
{primaryLinks.map((link) => (
              <AdminLinkItem
                key={link.href}
                link={link}
                current={current}
              />
            ))}
          </div>

          <details
            className="rounded-lg border border-border/[0.08] bg-card/30"
            open={moreActive || undefined}
          >
            <summary className="cursor-pointer list-none px-3 py-3 text-body-sm text-foreground-secondary hover:text-foreground">
              更多后台功能
              <span className="ml-2 text-caption text-foreground-tertiary">
                六爻资料、规则、会员运营等
              </span>
            </summary>
            <div className="space-y-4 border-t border-border/[0.08] p-3">
              {moreGroups.map((group) => (
                <section key={group.label}>
                  <p className="mb-2 text-caption font-medium text-foreground-tertiary">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.links.map((link) => (
                      <AdminLinkItem
                        key={link.href}
                        link={link}
                        current={current}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </>
  );
}
