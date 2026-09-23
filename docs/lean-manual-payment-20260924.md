# Lean payment and consultation retirement — 2026-09-24

## Authorized scope / rollback

- User selected manual payment and confirmed Telegram **@jackuwin**. Payment contacts do not grant membership.
- Files: checkout/pricing/order-status copy, manual checkout component, shared lean policy, automatic payment entry points/readiness/worker, reconcile-payments schedule, consultation submission/page gates and tests.
- No database migration, price/address change, new secret or new paid service. No historical rows or storage objects are removed. No trading switch, exchange credential, forecast direction, or trading schedule is changed.
- Rollback is a reviewed source revert/redeployment, not a toggle of old production environment variables. Historical encrypted consultation data must retain the original encryption key to become readable again; never generate a replacement and claim recovery.
- Gate: targeted runtime tests, TypeScript, Next production build, independent review and impact audit. A local build is not production acceptance. VPS installer must print `UPGRADE VALIDATION PASSED` after real runtime acceptance before the larger Pro-cancellation goal can finish.

## Customer flow

1. Log in, choose the existing plan. Confirm plan price and renewal eligibility with support before transfer.
2. Checkout shows the existing configured TRC20 receiving address; BEP20 only if previously enabled. Pricing no longer displays a potentially disabled BEP20 address.
3. Send registered email, plan, network, actual received amount and TXID to the verified Telegram handle. Include any old order number; never send credentials or pay twice.
4. This is contact-only checkout, not an online order intake. No hash submission form, polling, unique suffix, countdown, chain API or automatic membership grant is used. Old order pages remain available.

## Administrator runbook

- Independently check the transaction in the receiving wallet / official chain explorer: successful confirmed transfer, correct network/token contract/recipient, actual net amount and date. A screenshot or a submitted TXID alone is not receipt evidence.
- Confirm account ownership with the registered user; do not open benefits for an unrelated email supplied in a forwarded message.
- Search old orders, payment history and membership operation records for the TXID before granting. Never grant twice for a prior automatic payment or an earlier manual adjustment. Resolve old pending/underpaid orders explicitly; do not run automatic retry.
- Use the existing administrator user-membership action, with plan, confirmation and reason including `manual payment; network; TXID; actual amount; receipt date`. Keep the same requestId when retrying an uncertain result. Confirm the existing expiry and resulting expiry, then inform the customer.
- The administrator UI now derives a stable requestId from user/action/trimmed reason (SHA-256 truncated to a UUID shape); an identical uncertain retry survives page/browser restarts. Retain the same reason when retrying and inspect the audit first. Distinct real receipts must have distinct TXIDs in their reason. The client in-flight latch prevents parallel double-clicks; this is not a new atomic backend transaction or a cross-operator payment ledger.
- This reuses the existing ADMIN_ADJUSTMENT audit, not the automatic-payment revenue ledger. Do not call these operations verified automatic paid conversions or invent orders. Reconcile manual receipts separately; preserve existing founder/referral entitlements and resolve continuity or rewards through the existing reviewed admin process, not by changing price or granting unverified discounts.
- No automatic email or Telegram bot is introduced. Existing authenticated historical-payment review remains available; it does not become a public grant route.

## Retired automation and consultations

- Only the reconcile-payments minute schedule is removed. Authenticated stale cron requests no-op before expiry, recovery, chain scanning or email retry. Worker and public auto endpoints fail closed independently. Admin automatic retries/chain-based goodwill checks are blocked, while existing authoritative historical evidence review remains available.
- Legacy public payment submission is redirected to manual contact too; no new storage-based claims are exposed.
- Consultation page displays a bilingual pause notice. Member GET/POST/PATCH fail closed after the existing member/device guard, before bootstrapping quota or encryption calls. Existing explicit user cancellation/privacy deletion requests keep their original authorization; this release itself deletes nothing.
- New consultation add-on deliveries are paused, not recorded as successful. Existing encrypted request, answer and quota records are retained. Advertised new consultation quotas are removed from pricing; outstanding benefits go to support review, not silent forfeiture.
- This release does not cancel either Pro plan. DB capacity, egress, VPS runtime, authenticated member access and actual production deployment remain separate migration gates.

## Local release verification

- Targeted suites covered 99 distinct tests across payment/auth/membership, manual flow, scheduling, cron authorization and daily accuracy; all passed.
- TypeScript and the final Next.js production build passed (65 pages generated). Six existing lint warnings remain; no new build error was suppressed.
- Independent payment review passed with no P1/P2 findings. Impact audit: 45 affected files, zero blockers. `git diff --check` passed.
- Production-build browser check verified English and Simplified Chinese pricing, unchanged 80/200/700 list prices, Telegram link, manual activation instructions and consultation pause wording. No real payment or membership change was performed.
- These are local checks, not evidence of VPS cutover or Pro cancellation. Record live deployment acceptance separately.
