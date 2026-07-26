# MoonX Design System

A dark-mode-first design system built for a large SaaS product. Every
token below is defined once in `styles/globals.css` as a CSS custom
property, then exposed to Tailwind via `tailwind.config.ts`. Components
should only ever reference the Tailwind class names — never a raw hex value.

## Theme Variables

All tokens live under `:root` in `styles/globals.css`. Colors are stored
as unwrapped HSL triplets (e.g. `247 87% 67%`) so Tailwind can apply
opacity modifiers like `bg-primary/10`.

## Color System

| Token | Tailwind class | Usage |
|---|---|---|
| `--background` | `bg-background` | Page background |
| `--background-secondary` | `bg-background-secondary` | Section/alt backgrounds |
| `--card` | `bg-card` | Card surfaces |
| `--foreground` | `text-foreground` | Primary text |
| `--foreground-secondary` | `text-foreground-secondary` | Secondary text |
| `--foreground-tertiary` | `text-foreground-tertiary` | Muted/hint text |
| `--primary` | `bg-primary` / `text-primary` | Brand CTAs, links, focus |
| `--secondary` | `bg-secondary` / `text-secondary` | Secondary accent |
| `--success` | `text-success` | Positive states |
| `--warning` | `text-warning` | Caution states |
| `--danger` | `text-danger` | Destructive/error states |
| `--info` | `text-info` | Informational states |
| `--border` | `border-border` | Default hairline borders |

Every color supports Tailwind's opacity modifier syntax, e.g.
`bg-primary/10`, `border-border/[0.08]`.

## Typography

Font: **Inter**, loaded via `next/font/google` and exposed as the
`--font-inter` CSS variable in `app/layout.tsx`.

| Scale | Class | Size | Usage |
|---|---|---|---|
| Display Large | `text-display-lg` | 4.5rem | Hero headlines |
| Display Medium | `text-display-md` | 3.5rem | Large section titles |
| Display Small | `text-display-sm` | 3rem | Section titles |
| Heading Large | `text-heading-lg` | 2rem | Sub-section titles |
| Heading Medium | `text-heading-md` | 1.5rem | Card headings |
| Heading Small | `text-heading-sm` | 1.25rem | Compact headings |
| Body | `text-body` | 1rem | Default body text |
| Body Small | `text-body-sm` | 0.875rem | Secondary body text |
| Caption | `text-caption` | 0.75rem | Labels, badges, captions |

Use the `Heading` component (`components/ui/Heading.tsx`) rather than raw
`<h1>`–`<h6>` tags so semantic level and visual size stay decoupled.

## Spacing System

Built on Tailwind's default 4px-based scale, extended with a few
semantic values:

| Token | Value | Usage |
|---|---|---|
| `spacing.18` | 4.5rem | Header/nav heights |
| `spacing.22` | 5.5rem | Large vertical gaps |
| `spacing.30` | 7.5rem | Hero-level spacing |
| `spacing.header` | `var(--header-height)` | Fixed header offset |

Layout rhythm is standardized through the `Section` component's `spacing`
prop (`none | sm | md | lg`) instead of ad-hoc `py-*` classes.

## Border Radius System

Every radius derives from a single `--radius` variable (`1rem`), so the
entire app can be made sharper or rounder from one place.

| Class | Formula | Value |
|---|---|---|
| `rounded-sm` | `var(--radius) - 12px` | 4px |
| `rounded` / `rounded-md` | `var(--radius) - 4px` | 12px |
| `rounded-lg` | `var(--radius)` | 16px |
| `rounded-xl` | `var(--radius) + 4px` | 20px |
| `rounded-2xl` | `var(--radius) + 8px` | 24px |

## Shadows

| Token | Class | Usage |
|---|---|---|
| `--shadow-soft` | `shadow-soft` | Default card elevation |
| `--shadow-elevated` | `shadow-elevated` | Modals, popovers |
| `--shadow-glow` | `shadow-glow` | Primary CTA emphasis |
| `--shadow-glow-sm` | `shadow-glow-sm` | Subtle hover emphasis |

## Effects & Motion

- **Glass**: `.glass` / `.glass-card` utility classes (blur + translucent border)
- **Gradient text**: `.gradient-text` or `<Heading gradient />`
- **Animations**: `animate-fade-in`, `animate-fade-in-up`, `animate-slide-in-right`, `animate-float`, `animate-pulse-soft`

## Primitives (`components/ui/`)

| Component | Purpose |
|---|---|
| `Button` | Actions — `primary \| secondary \| ghost \| outline \| danger` variants, `sm \| md \| lg \| icon` sizes, loading state |
| `Card` | Content surface — glass or solid, optional hover lift |
| `Section` | Vertical rhythm + optional container wrapper for page sections |
| `Container` | Horizontal max-width + gutters |
| `Badge` | Status/label pill — semantic color variants |
| `Heading` | Semantic heading decoupled from visual size, optional gradient |

## Extending the System

1. Add or change a raw value only in `styles/globals.css` (`:root`).
2. Expose it in `tailwind.config.ts` under `theme.extend`.
3. Consume it via the generated Tailwind class in components.

This keeps a single source of truth and makes future theming (light
mode, white-labeling) a config-only change.
