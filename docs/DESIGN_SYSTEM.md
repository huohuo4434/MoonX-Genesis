# MoonX Design System

MoonX is a premium **Prediction Intelligence Platform**. The design system
exists to make every future screen feel like it belongs to the same
product — Apple's restraint, Stripe's clarity, Linear's precision,
Vercel's polish, and the dense, no-nonsense legibility of a Bloomberg
terminal.

This document explains every token and component in `styles/globals.css`,
`tailwind.config.ts`, `components/ui/`, `components/data/`, and
`components/charts/`. It does **not** describe any product page — no
homepage, assets page, forecast page, or timeline exists yet. Everything
here is a primitive meant to be assembled later.

## Design principles

1. **Restraint over decoration.** No gradients as a default treatment,
   no drop shadows for their own sake. Color and elevation are used to
   communicate hierarchy and state, not to decorate.
2. **Typography and spacing carry the design.** With a near-monochrome
   dark palette, most of the visual language comes from type scale,
   weight, and whitespace — closer to Stripe docs or Linear than a
   typical marketing site.
3. **Data is a first-class citizen.** Numbers (prices, percentages,
   scores) are set in a monospaced, tabular-figure font so they stay
   aligned in tables and don't jitter as values update — the Bloomberg
   terminal influence.
4. **One source of truth per value.** Every color, radius, shadow, and
   spacing value is defined once as a CSS custom property in
   `styles/globals.css` and exposed to Tailwind via `tailwind.config.ts`.
   Components reference Tailwind classes only — never a raw hex value or
   pixel size.
5. **Headless primitives, styled once.** Interactive components
   (Dialog, Select, Tabs, Tooltip, Dropdown, Checkbox, Switch, Avatar,
   Toast) are built on [Radix UI](https://www.radix-ui.com/primitives)
   rather than hand-rolled. Radix handles focus trapping, portals,
   scroll locking, roving tabindex, and ARIA wiring correctly out of the
   box — reimplementing that per component is exactly the kind of
   duplicated, bug-prone code this system is meant to avoid.

---

## 1. Typography System

Two font families, loaded via `next/font/google` in `app/layout.tsx` and
exposed as CSS variables (`--font-inter`, `--font-mono`):

- **Inter** (`font-sans`, default) — UI text, headings, body copy.
- **JetBrains Mono** (`font-mono`) — prices, percentages, scores, and any
  tabular/numeric data. Pair with the `.tabular-figures` utility
  (`font-variant-numeric: tabular-nums`) so digit widths never shift.

### Scale

Defined in `tailwind.config.ts` → `theme.extend.fontSize`. Each entry
bundles size, line-height, letter-spacing, and weight so a single class
fully defines a text style.

| Token | Class | Size | Weight | Use |
|---|---|---|---|---|
| Display | `text-display` | 56px | 700 | The one largest element on a screen — hero numbers, landing headline |
| H1 | `text-h1` | 40px | 700 | Page titles |
| H2 | `text-h2` | 32px | 600 | Major section titles |
| H3 | `text-h3` | 24px | 600 | Card/subsection titles |
| Body | `text-body` | 16px | 400 | Default paragraph text |
| Body Small | `text-body-sm` | 14px | 400 | Secondary/supporting body text |
| Caption | `text-caption` | 12px | 500 | Meta text, timestamps, badge labels |
| Label | `text-label` | 13px | 600 | Form labels, UI chrome text |

Mono is a **family**, not a size — apply `font-mono` (optionally with
`text-body-sm` or `text-caption`) to any of the above.

### Components

- **`Heading`** (`components/ui/Heading.tsx`) — renders Display/H1/H2/H3.
  The `as` prop (semantic tag) is decoupled from `size` (visual scale) so
  a page keeps correct heading order for SEO/accessibility while looking
  however large the design calls for. Supports `gradient` for the brand
  gradient treatment — use sparingly, on at most one element per screen.
- **`Text`** (`components/ui/Text.tsx`) — renders Body/Body Small/Caption/
  Label/Mono. `variant` picks the type style, `color` picks
  primary/secondary/tertiary/disabled, `as` overrides the element.

```tsx
<Heading as="h1" size="display" gradient>MoonX</Heading>
<Text variant="body-sm" color="secondary">Supporting copy</Text>
<Text variant="mono">$128,204.55</Text>
```

---

## 2. Spacing System

A semantic scale layered on top of Tailwind's default 4px scale (`p-1`,
`gap-2`, etc. still work). Defined in `tailwind.config.ts` →
`theme.extend.spacing`:

| Token | Value | Px |
|---|---|---|
| `xs` | 0.5rem | 8px |
| `sm` | 0.75rem | 12px |
| `md` | 1rem | 16px |
| `lg` | 1.5rem | 24px |
| `xl` | 2rem | 32px |
| `2xl` | 3rem | 48px |
| `3xl` | 4rem | 64px |

Use these for anything that expresses **rhythm** (card padding, gaps
between sections, stack spacing) — e.g. `p-lg`, `gap-md`, `py-2xl`.
Reserve the numeric scale (`p-4`, `gap-2`) for fine, one-off adjustments.

Page-level vertical rhythm is standardized through **`Section`**
(`components/ui/Section.tsx`, `spacing="none | sm | md | lg"`) instead of
ad-hoc `py-*` classes on every page.

---

## 3. Color Tokens

Every color is an unwrapped HSL triplet (e.g. `247 87% 67%`) in
`styles/globals.css` `:root`, so Tailwind's opacity modifier works
everywhere: `bg-primary/10`, `border-border/[0.08]`, `text-danger/80`.

| Token | Class | Role |
|---|---|---|
| Background | `bg-background` | Page canvas — the darkest layer |
| Surface | `bg-surface` | Raised layer above background — nav bars, sidebars, table headers |
| Card | `bg-card` | Content containers — cards, popovers, modals |
| Border | `border-border` | Hairline borders (always used with an opacity modifier, e.g. `/[0.08]`) |
| Primary | `bg-primary` / `text-primary` | Brand actions, links, focus ring |
| Secondary | `bg-secondary` / `text-secondary` | Secondary accent |
| Success | `text-success` / `bg-success` | Positive states, gains |
| Warning | `text-warning` / `bg-warning` | Caution states |
| Danger | `text-danger` / `bg-danger` | Destructive actions, losses, errors |
| Muted | `bg-muted` | De-emphasized fills — disabled inputs, skeletons, secondary chips |
| Text Primary | `text-foreground` | Primary text |
| Text Secondary | `text-foreground-secondary` | Secondary/supporting text |

Two extra tiers exist beyond the core list for finer control:
`text-foreground-tertiary` (hints, placeholders) and
`text-foreground-disabled` (disabled text). `info` mirrors `secondary`
for informational states that shouldn't read as "brand blue."

---

## 4. Radius System

Every radius derives from one `--radius` variable (`1rem`), so the whole
product can be made sharper or rounder from a single place.

| Class | Formula | Value |
|---|---|---|
| `rounded-sm` | `var(--radius) - 12px` | 4px |
| `rounded` / `rounded-md` | `var(--radius) - 4px` | 12px |
| `rounded-lg` | `var(--radius)` | 16px |
| `rounded-xl` | `var(--radius) + 4px` | 20px |
| `rounded-2xl` | `var(--radius) + 8px` | 24px |
| `rounded-full` | — | 9999px (pills, avatars, dots) |

## 5. Shadow System

| Token | Class | Usage |
|---|---|---|
| `--shadow-soft` | `shadow-soft` | Default card elevation |
| `--shadow-elevated` | `shadow-elevated` | Modals, dropdowns, popovers, tooltips |
| `--shadow-glow` | `shadow-glow` | Primary CTA emphasis |
| `--shadow-glow-sm` | `shadow-glow-sm` | Subtle hover emphasis |

Tailwind's default `shadow-sm`/`shadow`/`shadow-md`/etc. remain available
for one-off needs, but any *elevation that recurs* should get a named
token here instead.

## 6. Animation Tokens

Two animation systems coexist by design:

- **Brand motion** — hand-authored keyframes in `tailwind.config.ts` for
  marketing/emphasis moments: `animate-fade-in`, `animate-fade-in-up`,
  `animate-slide-in-right`, `animate-pulse-soft`, `animate-float`, plus
  `.animate-delay-{100..600}` helpers for staggering.
- **Component motion** — the [`tailwindcss-animate`](https://github.com/jamiebuilds/tailwindcss-animate)
  plugin, which every Radix-based component (`Dialog`, `Modal`,
  `Select`, `Dropdown`, `Tooltip`, `Toast`) uses via `data-[state=...]`
  attributes, e.g. `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`.
  This ties enter/exit animation directly to Radix's own open/closed
  state instead of manual timers.

**Reduced motion**: a single global rule in `styles/globals.css`
collapses all animation/transition durations to near-zero under
`@media (prefers-reduced-motion: reduce)`. This is automatic and applies
to Radix's animations too — no per-component opt-out needed.

---

## 7. Icons

Every icon is a named export from `components/icons/index.tsx`, built
from a single `createIcon` factory so stroke width (1.5px), sizing, and
`viewBox` stay consistent. Never inline a one-off `<svg>` in a feature
component — add it to this file so it can be reused and audited.

Current set: `ChevronDown/Up/Left/Right`, `ChevronsUpDown`, `ArrowRight`,
`ArrowLeft`, `ArrowUpRight`, `TrendingUp/Down`, `Check`, `Minus`, `Plus`,
`Close`, `Menu`, `MoreHorizontal`, `Search`, `AlertTriangle`, `Info`,
`ExternalLink`, `Circle`, `Star`, `Shield`, `Spinner`. Every icon accepts
a `size` prop (default `16`) and forwards a ref.

---

## 8. UI Components (`components/ui/`)

All variant-driven components use [`class-variance-authority`](https://cva.style/docs)
(`cva`) instead of hand-rolled `Record<Variant, string>` maps — one
definition of variants/sizes per component, fully typed, and trivially
tree-shakeable since it's just string concatenation with no runtime
component overhead.

| Component | Built on | Notes |
|---|---|---|
| `Button` | `cva` + Radix `Slot` | `variant`: primary/secondary/ghost/outline/danger/link · `size`: sm/md/lg/icon · `isLoading` · `asChild` to render as a router `Link` while keeping button styling |
| `Input` | native | Leading/trailing icon slots, `error`/`hint` text, `aria-invalid`/`aria-describedby` wired automatically |
| `Textarea` | native | Same error/hint pattern as `Input` |
| `Select` | Radix Select | Full keyboard nav, scroll buttons, portal-rendered content |
| `Dropdown` | Radix Dropdown Menu | Items, checkbox items, radio items, submenus, shortcuts |
| `Checkbox` | Radix Checkbox | Supports `indeterminate` state |
| `Switch` | Radix Switch | `role="switch"` semantics for free |
| `Tabs` | Radix Tabs | Roving tabindex, arrow-key navigation |
| `Dialog` | Radix Dialog | Structured: `DialogHeader/Title/Description/Footer` — use for confirmations and forms |
| `Modal` | Radix Dialog (same primitive as `Dialog`) | Free-form content without the header/footer structure; `size`: sm/md/lg/xl/full |
| `Toast` | Radix Toast | `ToastProvider` + imperative `toast({ title, description, variant })` API, mount `ToastProvider` once near the app root |
| `Tooltip` | Radix Tooltip | Wrap the app once in `TooltipProvider` for shared open/close delay |
| `Badge` | `cva` | default/success/warning/danger/info/neutral/outline |
| `Avatar` | Radix Avatar | `src` + `fallback` (initials), graceful fallback on image load failure |
| `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` | native | `hover` lift, `glass` treatment (opt-in, not default), `padding` scale |
| `StatCard` | `Card` + `Text` | Label + large mono value + optional delta/icon — dashboard metric tile |
| `EmptyState` | native | Icon + title + description + action slot |
| `Skeleton` | native | `animate-pulse` block for loading states |
| `Spinner` | `SpinnerIcon` | `role="status"` + visually-hidden "Loading…" text |
| `Section` | native | Vertical rhythm (`spacing: none/sm/md/lg`) + optional `Container` |
| `Container` | native | Horizontal max-width + gutters |
| `Divider` | native | Horizontal/vertical, optional centered label |
| `Breadcrumb` | native | `nav[aria-label="Breadcrumb"]`, `aria-current="page"` on the last item |
| `Pagination` | native | Compact page list with ellipsis collapsing for large page counts |

---

## 9. Data Components (`components/data/`)

Presentational only — every component takes values via props. **No mock
or sample financial data is defined anywhere in the design system.**

| Component | Purpose |
|---|---|
| `Price` | Currency-formatted, mono, tabular-figure price |
| `Percentage` | Signed percentage, auto-colored green/red/neutral |
| `ChangeIndicator` | Trend icon + signed percentage in one compact element |
| `TrendBadge` | Bullish/Bearish/Neutral pill with icon |
| `ConfidenceBadge` | High/Medium/Low confidence pill, derivable from a 0–100 `score` |
| `StatusBadge` | Dot + label status (active/pending/closed/error/draft) |
| `RiskBadge` | Low/Medium/High/Critical risk pill |
| `ScoreBadge` | Numeric `value/max` chip with tiered success/warning/danger coloring |

---

## 10. Charts (`components/charts/`)

Chrome only — **no charting library is included yet**, per spec.

- **`ChartContainer`** — the card shell every chart will eventually sit
  in: title, subtitle, an action slot (e.g. a range `Tabs`/`Select`), a
  fixed-height body, and a legend slot below it.
- **`ChartPlaceholder`** — a dotted-grid placeholder body to drop into
  `ChartContainer` until a real chart is implemented.
- **`ChartSkeleton`** — a loading-state body (animated bars) for when
  data is being fetched.

```tsx
<ChartContainer title="Forecast accuracy" subtitle="Last 30 days">
  <ChartPlaceholder label="Line chart" />
</ChartContainer>
```

When a charting library is chosen later, only the body changes — the
surrounding chrome and card styling stay identical across every chart in
the product.

---

## 11. Accessibility

- **Keyboard navigation** — every interactive component is either a
  native element (`button`, `input`) or a Radix primitive, both of which
  ship full keyboard support (Tab/Shift+Tab, Arrow keys in `Tabs`/
  `Select`/`Dropdown`, Escape to close `Dialog`/`Modal`/`Dropdown`/
  `Select`).
- **Focus ring** — the shared `.focus-ring` utility
  (`focus-visible:ring-2 ring-ring/50 ring-offset-2`) is applied to every
  focusable primitive, so focus is only ever visible for keyboard users
  (`:focus-visible`, not `:focus`) and consistent in color/offset
  everywhere.
- **ARIA** — handled by Radix for complex widgets (dialog, listbox,
  menu, switch, tabs, tooltip roles + state attributes). Custom
  components set ARIA by hand where relevant: `Input`/`Textarea` wire
  `aria-invalid`/`aria-describedby` to their hint/error text,
  `Breadcrumb` uses `aria-current="page"`, `Pagination` uses
  `aria-current="page"` and `aria-label` on prev/next controls.
- **Reduced motion** — a single global media query
  (`prefers-reduced-motion: reduce`) neutralizes all animation and
  transition durations app-wide, including third-party (Radix)
  animations, without needing per-component logic.

## 12. Responsive Design

- `Container` and `Section` provide the base responsive scaffolding —
  fluid width with max-width + gutters that adjust at Tailwind's `lg:`
  breakpoint.
- Components avoid fixed pixel widths in favor of relative sizing
  (`w-full`, `max-w-*`) so they reflow naturally from mobile to desktop.
- `Tabs`, `Dropdown`, and `Select` content is scrollable and
  viewport-aware out of the box via Radix's collision detection —
  menus never render off-screen on small viewports.

## 13. Performance

- **Tree-shaking** — every module uses named exports (no default-export
  barrels), so bundlers can eliminate unused components even when
  importing from `@/components/ui`.
- **Reusable variants, no duplicated code** — `cva` centralizes variant
  logic for `Button`, `Badge`, `Avatar`, `Toast`, and `Modal` instead of
  repeating conditional class strings per component.
- **Headless primitives** — Radix ships zero default styling, so there
  is no CSS to override or unused styles to ship; the only CSS that
  reaches the client is what's written in this design system.
- **Fonts** — both typefaces load through `next/font/google`
  (self-hosted, zero layout shift, automatic subsetting).

---

## Extending the system

1. Add or change a raw value only in `styles/globals.css` (`:root`).
2. Expose it in `tailwind.config.ts` under `theme.extend`.
3. Consume it via the generated Tailwind class in components — never a
   raw hex value or pixel size.
4. New interactive components should be built on a Radix primitive
   whenever one exists for that pattern, styled with the tokens above.

This keeps a single source of truth and makes future theming (light
mode, white-labeling) a config-only change — no component code should
need to change to support a new theme.
