/**
 * Abstract, CSS-only visual — concentric orbit rings with glowing nodes
 * over a faint coordinate grid. No images, no chart library, no external
 * assets. Motion is slow and continuous (40–55s per rotation) so it reads
 * as ambient rather than attention-grabbing, and is fully neutralized by
 * the global `prefers-reduced-motion` rule.
 */
export function HeroDataOrbit() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center sm:h-[380px] sm:w-[380px] lg:h-[440px] lg:w-[440px]"
    >
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 bg-grid-fade" />

      <div className="absolute inset-[4%] rounded-full border border-primary/15 animate-spin-slow">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-glow-sm" />
      </div>

      <div className="absolute inset-[20%] rounded-full border border-secondary/20 animate-spin-slow-reverse">
        <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-secondary shadow-glow-sm" />
      </div>

      <div
        className="absolute inset-[38%] rounded-full border border-border/25 animate-spin-slow"
        style={{ animationDuration: "28s" }}
      >
        <span className="absolute bottom-0 left-1/4 h-1.5 w-1.5 translate-y-1/2 rounded-full bg-foreground-secondary" />
      </div>

      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-glow animate-pulse-soft">
        <span className="h-2 w-2 rounded-full bg-white/90" />
      </div>
    </div>
  );
}
