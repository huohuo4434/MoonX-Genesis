/**
 * Reads the live design-system color tokens (`styles/globals.css`) at
 * runtime and exposes them as literal `hsl(...)` strings the
 * `lightweight-charts` canvas API can use directly. Canvas 2D color parsing
 * does not resolve `var(--x)` the way CSS does, so this is the one place
 * that "crosses the bridge" from CSS custom properties to literal colors —
 * every other component keeps using Tailwind classes / CSS variables as
 * normal.
 */
import type { PriceLevelKind, PriceZoneKind } from "@/types/forecast-chart";

export interface ChartThemeTokens {
  success: string;
  danger: string;
  warning: string;
  primary: string;
  border: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundTertiary: string;
  surface: string;
  card: string;
}

const FALLBACK_TOKENS: ChartThemeTokens = {
  success: "142 71% 45%",
  danger: "0 84% 60%",
  warning: "38 92% 50%",
  primary: "247 87% 67%",
  border: "0 0% 100%",
  foreground: "0 0% 100%",
  foregroundSecondary: "240 5% 65%",
  foregroundTertiary: "240 4% 46%",
  surface: "240 8% 7%",
  card: "240 6% 10%",
};

/** Reads the current CSS custom properties from `:root`. Safe to call only on the client. */
export function readChartThemeTokens(): ChartThemeTokens {
  if (typeof window === "undefined") return FALLBACK_TOKENS;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    success: read("--success", FALLBACK_TOKENS.success),
    danger: read("--danger", FALLBACK_TOKENS.danger),
    warning: read("--warning", FALLBACK_TOKENS.warning),
    primary: read("--primary", FALLBACK_TOKENS.primary),
    border: read("--border", FALLBACK_TOKENS.border),
    foreground: read("--foreground", FALLBACK_TOKENS.foreground),
    foregroundSecondary: read("--foreground-secondary", FALLBACK_TOKENS.foregroundSecondary),
    foregroundTertiary: read("--foreground-tertiary", FALLBACK_TOKENS.foregroundTertiary),
    surface: read("--surface", FALLBACK_TOKENS.surface),
    card: read("--card", FALLBACK_TOKENS.card),
  };
}

/** Builds a literal `hsl(h s% l% / a)` string from a token's `"h s% l%"` triplet. */
export function hslToken(triplet: string, alpha = 1): string {
  return `hsl(${triplet} / ${alpha})`;
}

export function levelColor(kind: PriceLevelKind, tokens: ChartThemeTokens): string {
  switch (kind) {
    case "support":
    case "major-support":
      return hslToken(tokens.success, kind === "major-support" ? 0.95 : 0.75);
    case "resistance":
    case "major-resistance":
      return hslToken(tokens.danger, kind === "major-resistance" ? 0.95 : 0.75);
    case "target":
      return hslToken(tokens.primary, 0.95);
    case "invalidation":
      return hslToken(tokens.warning, 0.95);
    default:
      return hslToken(tokens.foregroundTertiary, 0.7);
  }
}

export function levelWidth(kind: PriceLevelKind): 1 | 2 {
  return kind === "major-support" || kind === "major-resistance" || kind === "target" || kind === "invalidation" ? 2 : 1;
}

export function zoneColor(kind: PriceZoneKind, tokens: ChartThemeTokens): { background: string; border: string } {
  switch (kind) {
    case "consolidation":
      return { background: hslToken(tokens.primary, 0.12), border: hslToken(tokens.primary, 0.3) };
    case "support":
      return { background: hslToken(tokens.success, 0.08), border: hslToken(tokens.success, 0.22) };
    case "resistance":
      return { background: hslToken(tokens.danger, 0.08), border: hslToken(tokens.danger, 0.22) };
    case "peak":
      return { background: hslToken(tokens.warning, 0.1), border: hslToken(tokens.warning, 0.28) };
    default:
      return { background: hslToken(tokens.foregroundTertiary, 0.06), border: hslToken(tokens.foregroundTertiary, 0.2) };
  }
}
