import Link from "next/link";

export default function AdminLoading() {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-5 text-foreground sm:px-6 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="rounded-2xl border border-border/[0.1] bg-muted/25 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-semibold">正在验证登录状态并载入后台</p>
            <p className="mt-1 text-xs text-foreground-tertiary">如果长时间没有完成，通常是登录已过期。</p>
          </div>
          <Link
            href="/login?next=/admin"
            className="mt-3 inline-flex rounded-full border border-primary/30 bg-primary/[0.08] px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/[0.14] sm:mt-0"
          >
            重新登录
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl border border-border/[0.08] bg-muted/20" />
          ))}
        </div>
        <div className="mt-4 h-48 animate-pulse rounded-2xl border border-border/[0.08] bg-muted/20" />
      </div>
    </main>
  );
}
