import Link from "next/link";
import { routes } from "@/lib/navigation";

const adminLinks = [
  { href: "/admin", label: "概览" },
  { href: "/admin/forecasts", label: "预测审核" },
  { href: "/admin/plans", label: "套餐" },
  { href: "/admin/payments", label: "订单" },
  { href: "/admin/members", label: "会员" },
  { href: "/admin/settings", label: "设置" },
];

export function AdminNav({ current }: { current?: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border/[0.08] pb-4">
      {adminLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-1.5 text-body-sm transition-colors ${
            current === link.href
              ? "bg-primary text-primary-foreground"
              : "text-foreground-secondary hover:bg-muted hover:text-foreground"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <Link href={routes.tomorrowForecast} className="ml-auto text-body-sm text-primary hover:underline">
        查看明日预测
      </Link>
    </nav>
  );
}
