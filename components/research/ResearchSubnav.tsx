"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/forecasts/daily", label: "Daily Forecasts" },
  { href: "/research/technical", label: "Technical Analysis" },
  { href: "/research/long-term", label: "Long-term Research" },
  { href: "/markets/watchlist", label: "Focused Assets" },
  { href: "/timeline", label: "Timeline" },
] as const;

export function ResearchSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Research navigation">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-body-sm transition-colors",
              active
                ? "border-white/20 bg-white text-black"
                : "border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.08]"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
