# MoonX Genesis

Production Next.js app for MoonX membership forecasts, payments, and research tooling.

## Tech Stack

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS
- Supabase Auth + Storage
- Prisma (Wave Analyst module; requires `DATABASE_URL`)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run db:migrate` | Apply `supabase/migrations` when DB URL is set |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Prisma migrate deploy |
| `npm run seed:wave` | Seed gold / SK Hynix / SanDisk / WTI wave rows |

## Wave Analyst Module

See [docs/wave-module.md](docs/wave-module.md). Admin entry: `/admin/wave`. Member card: `/member/tomorrow`.
