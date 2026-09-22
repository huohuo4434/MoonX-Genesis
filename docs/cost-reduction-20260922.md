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

## Second pass — September 22, 22:45 UTC+8

Scope: two reversible Vercel dashboard settings and this local audit record. No application/API code, database, environment values, trading switches, schedules or membership permissions changed. No new deployment was triggered solely for this document.

### Executed and verified

- Disabled team Observability Plus. UI confirmed `Observability Plus has been disabled` and the billing switch became unchecked. Basic included metrics/logging remain; advanced metrics and their extended retention are no longer available. Collection during the disabled interval cannot be recovered by re-enabling. Existing usage charges are not refunded. Rollback: re-enable the add-on only with renewed authority to incur its charges.
- Changed project Ignored Build Step from Automatic to `Only build production`. Saved rule: `if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi`. Navigated away/back and expanded Project Settings to verify the persisted value. Subsequent non-production Git builds are skipped; production builds remain permitted. No claim of a real preview push test. Restore Automatic before a future workflow requires online preview validation.
- Public read-only validation at `2026-09-22T14:45:16.911Z` passed all five checks and printed `UPGRADE VALIDATION PASSED`; `stored:false`. This is not an authenticated member/payment/price-freshness test.

### Current billing evidence, not a savings projection

Current-cycle Vercel usage breakdown (dashboard warns of up to one hour lag):

| Item | Usage charge (USD) |
| --- | ---: |
| Fluid provisioned memory | 12.14 |
| Fluid active CPU | 2.59 |
| Function invocations | 0.23 |
| Origin transfer | 0.21 |
| Edge request additional CPU | 0.01 |
| Observability events | 3.16 |
| Build CPU minutes | 4.75 |
| Infrastructure subtotal (dashboard) | 23.08 |

Displayed rounded line items can differ from the subtotal by a cent. Infrastructure credit -20.00 plus Pro license 20.00 gives the displayed total 23.08. These are incurred cycle-to-date amounts, not additional amounts to add again to the invoice or expected monthly savings. Observability showed 2.63M current-cycle billed events; its project configuration showed 3,573,431 events across the last 30 days, a different window.

### Already economical or absent

- Build machine Basic (2 vCPU / 8 GB); on-demand concurrent builds disabled.
- Fluid Compute enabled; function Standard (1 vCPU / 2 GB), not Performance. Left unchanged; reducing resources without runtime measurement could increase duration or cause failures.
- Speed Insights Plus, Web Analytics Plus, Flags unlimited overrides, preview suffix, HIPAA, SAML disabled. Paid password protection Manage(0). No log drains to remove.
- AI credit auto-reload off; Vercel Agent usage billing not enabled.
- Integrations dashboard: `No Integrations Installed`. This is not evidence that directly contracted external services are free.

### Remaining work / do not claim minimum cost achieved

- Pro subscription remains active through the displayed October 1 boundary; VPS migration and cutover have not passed acceptance.
- Supabase remains on sign-in. Its subscription, database resource usage and current migration configuration cannot be verified until the user signs into the original account. Payment/email/AI provider billing outside Vercel also remains unverified. No credentials requested in chat.
- Remaining scheduled jobs were inspected for dependencies. Member AI desk snapshots become stale after three minutes, and payment/trading safety jobs have timeliness requirements. Cadences were not blindly reduced. Historical crypto re-verification and forecast/review preparation remain candidates for a separately tested functional reduction, not claimed cancelled.
- Full cost minimization is incomplete. No new recurring automation, purchases, provider grants, secret export or credential rotation was introduced.
