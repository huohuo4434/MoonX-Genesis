"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep previously shared research anchors reachable after collapsing long context. */
export function LinkedResearchDetails({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const reveal = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = id ? document.getElementById(id) : null;
      if (target && ref.current?.contains(target)) {
        ref.current.open = true;
        target.scrollIntoView({ block: "start" });
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return <details ref={ref} open={initiallyOpen} className="mb-5 rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-semibold">{title}</summary>{children}</details>;
}
