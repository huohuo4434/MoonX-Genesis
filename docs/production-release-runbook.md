# MOOX production release

Production builds are deliberately side-effect free. `vercel-build` generates
Prisma Client and compiles Next.js; it does not seed data, publish forecasts,
run reviews, change memberships or send test email.

Release order:

1. Run targeted tests, `npm run typecheck`, `npm run build`, and the MOOX impact audit.
2. If the release contains a database migration, load production environment variables and run `npm run release:migrate`. A migration failure exits non-zero.
3. Deploy the verified commit to Vercel.
4. Load production environment variables and run `npm run release:validate -- --site https://mooxintel.com`.
5. Accept the release only when the command prints `UPGRADE VALIDATION PASSED`. The validator performs public GET checks and updates only `moonx_mvp/acceptance-latest.json`; it never creates users, submits payments, sends email, publishes forecasts or touches trading state.

Canonical weekly Liuyao sources are an explicit maintenance action:

```powershell
npm run release:seed:weekly
```

It is not part of build or deployment. Rollback is a Vercel alias rollback to
the previous verified deployment; no application data rollback is required for
the presentation and readiness changes in this release.
