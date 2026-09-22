# Member read efficiency — 2026-09-22

## Evidence and scope

- Production `db00fb7` logged a snapshot publisher 503 at Beijing 23:16:17, category `UNKNOWN`, duration 6100 ms. This is not evidence of a specific failed dependency.
- The member desk GET route called the member/device guard and then `getAccessUser` again inside the limiter. Both depend on fresh Supabase authentication. React cache is a render optimization, not a reliable request-local deduplicator for route handlers.
- Reuse only `gate.access`, after `ALLOWED`, for the existing user/device rate bucket. All other callers retain fresh identity lookup. No cross-request identity cache, changed membership rule, changed device rule or client-supplied identity.
- Return a generic desk read error, not raw provider messages.
- Extend fixed diagnostic categories for existing live-state and Prisma raw-query failures. No raw SQL, token, account identifier or error stack is logged.
- No database, environment, cron cadence, price tracking, trading execution, billing or published forecast changes.

## Verification / rollback

- Targeted tests exercise the actual limiter implementation with mocked identity and cookie dependencies and real in-memory rate limiting; check denied/allowed gate ordering and private snapshot-only response wiring.
- Independent review, TypeScript, production build and impact audit required before deployment.
- Production acceptance must include `UPGRADE VALIDATION PASSED`, authenticated member UI and fresh runtime logs. A quiet short log window does not establish that intermittent timeouts are solved.
- Rollback by reverting the single implementation commit and deploying normally. No data rollback is required.

## Reference checks

- https://react.dev/reference/react/cache — cache context is available inside React render, not arbitrary route-handler execution.
- https://supabase.com/docs/reference/javascript/auth-getuser — getUser performs a server request and returns authenticated identity; retain the guard's original getUser path.
- Supabase changelog checked; no new Supabase API, schema or SDK change is introduced.

## Status

Local gates passed: 47 targeted tests plus the added actual-handler test (48 distinct cases); final limiter/diagnostic suite 6/6. TypeScript and Next.js 15.5.22 production build passed. Existing unrelated unused-variable lint warnings remain. Impact audit: HIGH (auth path), 6 files, zero blockers. Independent reviewer passed the implementation and the final test delta. Code-review-graph is not installed in the current Python runtime or tool inventory.

## Production acceptance

- Commit `7f5717bcf15a9b6037b495bafc429473aaaa41bc`, Vercel deployment `dpl_2b5FrKYT6jzNLs7dziiGqLUNDjK7`, Ready, build 2m47s; production domain `mooxintel.com` verified on the deployment detail page.
- Full final targeted run: 48/48 pass.
- At `2026-09-22T15:34:21.864Z`, release validator passed home, pricing, login, anonymous member gate and auth health; printed `UPGRADE VALIDATION PASSED`. Optional report storage remained false (no local secret export).
- Additional anonymous GET `/api/member/ai-trading-desk`: 401, no positions or published plans leaked.
- Authenticated member page initially displayed stale 23:14 snapshot and correctly withheld entry levels. This exposed an ongoing intermittent publisher problem rather than a frontend success claim.
- The new deployment's scheduled publisher at Beijing 23:36:17 returned 200; subsequent authenticated page reload showed snapshot 23:36 and conditional plan content. The chart also loaded; captured browser warning/error log was empty.
- New-deployment log sample through 23:37 showed zero warning/error/fatal entries, with successful desk API, key-date chart and publisher requests. The deliberate anonymous 401 is expected.
- This short window does not establish the intermittent publisher problem is solved. The earlier db00fb7 23:16 failure remains unresolved; neither authentication deduplication nor subsequent successful publication proves its root cause.
- No quantitative latency/cost savings claim, no paid add-on, no new automation, and no change to execution authority.
