"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminLink = {
  href: string;
  label: string;
  badgeKey?: "payments";
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
  { href: "/admin/settings", label: "设置" },
];

const moreGroups: Array<{ label: string; links: AdminLink[] }> = [
  {
    label: "预测与交易",
    links: [
      { href: "/admin/trading-signals", label: "AI交易信号中心" },
      { href: "/admin/bitget-demo", label: "Bitget模拟执行" },
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
      { href: "/admin/membership-events", label: "会员流水" },
      { href: "/admin/payments", label: "付款审核", badgeKey: "payments" },
      { href: "/admin/referrals", label: "邀请管理" },
      { href: "/admin/social", label: "Social Content" },
    ],
  },
];

function usePendingCount(initialCount: number) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/admin/payments/pending-count", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { count?: number };
        if (!cancelled && typeof json.count === "number") setCount(json.count);
      } catch {
        /* ignore */
      }
    }
    refresh();
    const id = window.setInterval(refresh, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  return count;
}

export function AdminPendingBanner({ initialCount = 0 }: { initialCount?: number }) {
  const count = usePendingCount(initialCount);
  if (count <= 0) return null;
  return (
    <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-body-sm text-red-600 dark:text-red-400">
      有 {count} 笔会员付款等待审核{" "}
      <Link href="/admin/payments" className="underline underline-offset-2">
        前往审核
      </Link>
    </div>
  );
}

function AdminLinkItem({
  link,
  current,
  count,
}: {
  link: AdminLink;
  current?: string;
  count: number;
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
      {link.badgeKey === "payments" ? (
        <>
          {link.label} {count > 0 ? <span className="text-red-500">🔴 {count}</span> : null}
        </>
      ) : (
        link.label
      )}
      {link.badgeKey === "payments" && count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminNav({
  current,
  pendingCount = 0,
}: {
  current?: string;
  pendingCount?: number;
}) {
  const count = usePendingCount(pendingCount);
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
      <AdminPendingBanner initialCount={count} />
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
            {primaryLinks.map((link) => (
              <AdminLinkItem
                key={link.href}
                link={link}
                current={current}
                count={count}
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
                        count={count}
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
