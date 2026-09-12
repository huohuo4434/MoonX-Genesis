"use client";

import { useState } from "react";
import Link from "next/link";

type AdminLink = {
  href: string;
  label: string;
};

const primaryLinks: AdminLink[] = [
  { href: "/admin", label: "概览" },
  { href: "/admin/forecasts", label: "内容发布" },
  { href: "/admin/consultations", label: "会员问卦" },
  { href: "/admin/users", label: "用户与会员" },
  { href: "/admin/payments", label: "收款记录" },
  { href: "/member/notes", label: "随笔与回帖" },
  { href: "/admin/live-trading", label: "实盘开关与托管" },
  { href: "/admin/site-health", label: "系统健康" },
];

const moreGroups: Array<{ label: string; links: AdminLink[] }> = [
  {
    label: "预测与交易",
    links: [
      { href: "/admin/weekly", label: "周度行情" },
      { href: "/admin/stocks", label: "重点关注" },
      { href: "/admin/trading-terminal", label: "模拟交易" },
      { href: "/admin/trading-signals", label: "AI交易信号中心" },
      { href: "/admin/bitget-demo", label: "Bitget执行诊断" },
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
      { href: "/admin/forecast-control", label: "研究中心" },
      { href: "/admin/research-ingest", label: "统一资料入口" },
      { href: "/admin/external-viewpoints", label: "外部观点库" },
      { href: "/admin/stone-intelligence", label: "Stone 重要消息" },
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
      { href: "/admin/referrals", label: "邀请管理" },
      { href: "/admin/social", label: "社交内容" },
      { href: "/admin/automation", label: "自动化" },
      { href: "/admin/settings", label: "设置" },
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
      prefetch={false}
      aria-current={active ? "page" : undefined}
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
          aria-label="管理员导航"
          className={`${open ? "flex" : "hidden"} flex-col gap-3 md:flex`}
        >
          <div className="flex flex-wrap gap-2">
            {primaryLinks.map((link) => (
              <AdminLinkItem
                key={link.href}
                link={link}
                current={current}
              />
            ))}
          </div>

          <div className="grid items-start gap-2 md:grid-cols-3">
            {moreGroups.map((group) => (
              <details
                key={group.label}
                className="rounded-lg border border-border/[0.08] bg-card/30"
                open={group.links.some((link) => current === link.href || current?.startsWith(`${link.href}/`)) || undefined}
              >
                <summary className="cursor-pointer px-3 py-3 text-body-sm text-foreground-secondary hover:text-foreground">
                  {group.label}
                </summary>
                <div className="flex flex-col gap-1 border-t border-border/[0.08] p-2">
                    {group.links.map((link) => (
                      <AdminLinkItem
                        key={link.href}
                        link={link}
                        current={current}
                      />
                    ))}
                </div>
              </details>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
