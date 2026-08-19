// MOOX_V7208_ROUTE_INSTANT_LOADING

export default function Loading() {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-5 text-foreground sm:px-6 md:py-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="md:hidden">
          <div className="rounded-[28px] border border-border/[0.08] bg-muted/30 p-5">
            <div className="h-3 w-24 animate-pulse rounded-full bg-foreground/10" />
            <div className="mt-3 h-7 w-44 animate-pulse rounded-xl bg-foreground/10" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-foreground/[0.05]" />)}
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-3xl border border-border/[0.08] bg-muted/20" />)}
          </div>
        </div>
        <div className="hidden md:block">
          <div className="h-8 w-60 animate-pulse rounded-xl bg-foreground/10" />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl border border-border/[0.08] bg-muted/20" />)}
          </div>
          <div className="mt-6 h-64 animate-pulse rounded-3xl border border-border/[0.08] bg-muted/20" />
        </div>
      </div>
    </main>
  );
}
