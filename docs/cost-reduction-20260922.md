# Cost reduction — 2026-09-22

User authorized stopping optional automated monitoring while retaining price tracking and the rented VPS.

## This release

- Remove seven Vercel schedules: external analysts, X reports, Vibe evidence, social cards, lesson processing, strategy ensemble research, Qimen shadow research.
- Remove X freshness polling and automatic repair, so retained forecast checks cannot restart blogger collection. Show an explicit stopped notice; historical records are not fresh evidence.
- Preserve all other schedules for this first phase, including prices, member desk, payments, expiry, verification and trading protection. This is not a claim that only prices remain scheduled.
- No API authorization, environment variables, schema, stored forecasts, membership privileges, exchange positions, or execution switches are changed.
- Manual authenticated research endpoints remain available; external callers must separately stay disabled.

## Runtime work verified separately

Live recheck on September 22: VPS `moox-x-collector.timer` disabled/inactive and collector service inactive. `moox-stone-browser.service` remains in failed state (not running; not claimed healthy). Both local Windows X collector tasks are disabled; Codex growth/Substack automations are PAUSED. VPS router proxy remains active and security maintenance is retained.

## Billing boundary

The latest billing observation displayed Pro through 2026-10-01 and upcoming invoice $23.08 ($20 plan plus $3.08 on-demand), superseding the earlier $22.76 snapshot. AI credit auto-reload is off. These are snapshots, not guaranteed final charges or measured savings. Pro cancellation has NOT been completed. The commercial membership website still depends on Vercel; migrate and verify before cancelling. No other provider cancellation is claimed.

## Verification and rollback

Release acceptance: TypeScript, production build and 70 targeted scheduling/research/safety tests passed. Full release impact audit: LOW, ten files, zero blockers. Two additional regression failures (admin weekly freshness expected 21 versus 22; daily truth freshness expecting the retired 15-minute X check) were reproduced on unchanged ba1c210. The earlier shadow-scan regex failure also reproduces on that baseline. No unrelated prediction/trading implementation was changed to satisfy old assertions.

The Vercel connector 403 was avoided using the user's authorized browser session and existing GitHub-to-Vercel deployment workflow, not by expanding connector permissions. GitHub CLI keyring authentication failed; it was not reused. The separately configured Git transport successfully pushed main from ba1c210 to 6a0c43b.

## Production acceptance — 2026-09-22

- Production commit: `6a0c43bbcf5a1ef46606c0419c4c3e6c05929d76`.
- Vercel deployment: `dpl_4ERTEEddz86GCndSuYYsxbNToCiG`, Ready, production domain `mooxintel.com` assigned.
- Deployment details: https://vercel.com/huohuo2/moon-x-genesis/4ERTEEddz86GCndSuYYsxbNToCiG .
- Production Cron settings visibly contain 16 retained schedules; all seven retired schedules are absent. Global Cron remains enabled. No job was manually triggered.
- `npm run release:validate -- --site https://mooxintel.com` printed `UPGRADE VALIDATION PASSED` at `2026-09-22T14:28:39.698Z`.
- Home, pricing, login, anonymous member gate and auth health passed. Auth health reported configured/reachable; anonymous member check reported no private leak.
- Validator `stored:false`: console verification succeeded but was not stored in Supabase because local production credentials were unavailable.
- This validates phase-one production release, NOT a VPS migration, authenticated member workflow, payment transaction, complete runtime error scan or live price freshness.

VPS migration remains blocked on normal provider access and unavailable write-only production configuration. See the migration assessment. No secrets were revealed, rotated or exported.

Run `node --test tests/cost-reduction-scheduling-20260922.test.mjs`, targeted existing tests, TypeScript, production build, impact audit, then the production release validator. Deploy through the existing GitHub/Vercel route. Roll back only this commit if needed; no database rollback. A rollback restores old schedules, so reapply the cancellation configuration before resuming normal operations. Do not re-enable the VPS collector without renewed user authorization.
