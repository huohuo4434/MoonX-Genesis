# MoonX

Production-grade Next.js foundation for the MoonX platform. This
repository currently contains **only the project foundation** — design
system, primitives, and architecture — no product pages yet.

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org) (strict mode)
- [TailwindCSS 3](https://tailwindcss.com)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the
foundation-check page confirming fonts, theme tokens, and UI primitives
are wired up correctly.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/              Next.js App Router routes
components/
  ui/             Design-system primitives (Button, Card, Section, Container, Badge, Heading)
  layout/         Shared page chrome — empty until first page is built
  cards/          Domain-specific card components — empty until first feature is built
  charts/         Chart/visualization primitives — empty until first feature is built
  icons/          Generic SVG icon library
hooks/            Reusable client hooks (useMediaQuery, useLocalStorage, useMounted)
lib/              Framework-agnostic utilities (cn, formatters, ...)
types/            Generic, cross-cutting TypeScript types
styles/           Global CSS + theme variables
public/           Static assets
docs/             Architecture & design system docs
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — layering conventions, folder structure, how to add a feature
- [Design System](./docs/DESIGN_SYSTEM.md) — colors, typography, spacing, radius, shadows, primitives

## Design System at a Glance

Every color, radius, and shadow is defined once as a CSS variable in
`styles/globals.css` and exposed to Tailwind in `tailwind.config.ts`.
Never hardcode raw hex values in components — extend the theme instead.

```tsx
import { Button, Card, Section, Heading, Badge } from "@/components/ui";
```

## License

Proprietary — MoonX Intelligence Inc.
