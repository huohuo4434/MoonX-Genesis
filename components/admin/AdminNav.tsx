"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "概览" },
  { href: "/admin/forecasts", label: "今日／明日观点" },
  { href: "/admin/weekly", label: "本周行情" },
  { href: "/admin/stocks", label: "个股分析" },
  { href: "/admin/users", label: "用户与会员" },
  { href: "/admin/payments", label: "付款审核", badgeKey: "payments" as const },
  { href: "/admin/referrals", label: "邀请管理" },
  { href: "/admin/automation", label: "预测验证／自动化" },
  { href: "/admin/intelligence", label: "内部资料库" },
  { href: "/admin/wave", label: "波浪分析" },
  { href: "/admin/learning", label: "复盘学习" },
  { href: "/admin/settings", label: "设置" },
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

export function AdminNav({
  current,
  pendingCount = 0,
}: {
  current?: string;
  pendingCount?: number;
}) {
  const count = usePendingCount(pendingCount);
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdminPendingBanner initialCount={count} />
      <div className="mb-6 border-b border-border/[0.08] pb-4">
        <button
          type="button"
          className="mb-2 inline-flex min-h-11 items-center rounded-md border border-border/[0.12] px-3 text-body-sm text-foreground-secondary md:hidden"
          aria-expanded={open}
          aria-controls="admin-side-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起后台菜单" : "展开后台菜单"}
        </button>
        <nav
          id="admin-side-nav"
          className={`${open ? "flex" : "hidden"} flex-wrap gap-2 md:flex`}
        >
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative min-h-11 rounded-md px-3 py-2 text-body-sm transition-colors ${
                current === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground-secondary hover:bg-muted hover:text-foreground"
              }`}
            >
              {"badgeKey" in link && link.badgeKey === "payments" ? (
                <>
                  付款审核 {count > 0 ? <span className="text-red-600">🔴 {count}</span> : null}
                </>
              ) : (
                link.label
              )}
              {"badgeKey" in link && link.badgeKey === "payments" && count > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
