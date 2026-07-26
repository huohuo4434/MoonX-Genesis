# MoonX Architecture

This document describes the project foundation. It intentionally covers
structure and conventions only — no product features have been built yet.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 3, driven entirely by CSS theme variables
- **Font**: Inter, loaded via `next/font/google`

## Folder Structure

```
MoonX-Genesis/
├── app/                     # Next.js App Router routes
│   ├── layout.tsx           # Root layout — fonts, metadata, <html>/<body>
│   └── page.tsx             # Temporary foundation-check page
├── components/
│   ├── ui/                  # Design-system primitives (Button, Card, Section, ...)
│   ├── layout/              # Shared page chrome (Navbar, Footer, AppShell) — empty for now
│   ├── cards/                # Domain-specific card components — empty for now
│   ├── charts/               # Chart/visualization primitives — empty for now
│   └── icons/                # Generic SVG icon library
├── hooks/                   # Reusable client hooks (useMediaQuery, useLocalStorage, ...)
├── lib/
│   ├── utils.ts             # Framework-agnostic helper functions (cn, formatters, ...)
│   └── site-config.ts       # Single source of truth for site name/description/URL
├── types/
│   └── index.ts             # Generic, cross-cutting TypeScript types
├── styles/
│   └── globals.css          # Theme variables + Tailwind layers
├── public/                  # Static assets
└── docs/                    # Documentation (this file, DESIGN_SYSTEM.md)
```

## Layering Convention

The codebase is organized as strict layers, each only depending on the
ones below it:

1. **`lib/`, `hooks/`, `types/`** — pure, framework-light building blocks.
2. **`components/ui/`** — presentational primitives styled with design
   tokens. No business logic, no data fetching.
3. **`components/{layout,cards,charts,icons}/`** — composed, feature-aware
   components built out of `components/ui/` primitives.
4. **`app/`** — routes that compose components and own data fetching.

Never import "up" the stack (e.g. a `ui/` primitive must not import from
`app/`).

## Design System

See [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for the full token reference
(colors, spacing, radius, shadows, typography).

All design tokens are defined once as CSS custom properties in
`styles/globals.css` and consumed through Tailwind's `theme.extend` in
`tailwind.config.ts`. Components should always use the semantic Tailwind
classes (`bg-primary`, `text-foreground-secondary`, `rounded-lg`, `shadow-soft`,
...) — never hardcode raw hex/rgb values.

## Tooling & Code Quality

- **TypeScript** runs in `strict` mode plus additional safety flags:
  `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, and
  `forceConsistentCasingInFileNames` (the last one matters because
  development happens on a case-insensitive filesystem, but production
  deploys typically run on case-sensitive Linux).
- **ESLint** extends `next/core-web-vitals` and `next/typescript` — both
  are required for full linting coverage on a TypeScript Next.js app.
- **PostCSS** runs Tailwind through `autoprefixer` so vendor-prefixed
  properties (e.g. Firefox's `::-moz-selection`) are generated
  automatically based on the project's browser support target.

## Path Aliases

`@/*` resolves to the project root (configured in `tsconfig.json`), so
imports look like `@/components/ui`, `@/lib/utils`, `@/hooks`.

## Adding a New Feature

1. Define any new domain types next to the feature (not in the shared
   `types/index.ts`, which stays generic).
2. Build presentational pieces with `components/ui/` primitives first;
   only add new primitives there if they are truly generic and reusable.
3. Compose feature components under `components/cards/`, `components/charts/`,
   or `components/layout/` as appropriate.
4. Wire it up in `app/` with a route that owns data fetching.

## Future Integration Points

The foundation is deliberately unopinionated about backend/auth providers.
When ready, integrate them behind a thin wrapper (e.g. `lib/db.ts`,
`lib/auth.ts`) so the rest of the app depends on an interface, not a
specific vendor SDK.
