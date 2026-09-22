# Existing VPS migration assessment — 2026-09-22

Status: assessed, NOT deployed, no DNS cutover, no subscription cancelled.

## Verified live at 06:03 UTC

- Ubuntu 22.04.5, x86_64, 2 vCPU.
- RAM 3911 MiB total, 3360 MiB available; swap 255 MiB unused.
- Root disk 40 GiB, approximately 35 GiB available; load average 0.00.
- No Node.js runtime found on PATH; no nginx or Docker found on PATH.
- Ports 80/443 have no listening service. SSH and the existing authenticated router proxy remain running and must be preserved.
- No MOOX collector timers appear in the scheduled timer list after the prior shutdown.

Assessment: candidate for a low-traffic single-instance Next.js website; this is capacity screening, NOT a load test or availability guarantee. No additional server purchase is justified by this snapshot. Monthly bandwidth quota and actual application resource usage remain unverified.

## Lowest-risk target

Move the web application only, using a non-root Node.js service behind a TLS reverse proxy. Keep the existing external database, auth, membership records and storage for the first cutover. Do not restore blogger monitoring. Keep current router networking and OS security maintenance untouched. Avoid adding Redis, a paid CDN or another hosting subscription without measured need.

Next.js supports self-hosting: https://nextjs.org/docs/app/guides/self-hosting . Build on Linux with the correct public build-time configuration and production native Prisma dependencies; do not upload Windows node_modules or a secret-bearing build archive.

## Hard blockers before exposure

1. Production configuration and provider access must be reconciled through authorized tooling. Previous Vercel lookup failed with 403 for huohuo2. User consent to migration does not repair that OAuth scope. Do not copy stale environment files or repurpose unrelated credentials to bypass it.
2. Several cron routes use `if (!secret) return process.env.VERCEL !== "1"`. That is fail-open outside Vercel if the cron secret is missing. Require fail-closed authorization tests and a separate reviewer before migrating these routes; do not spoof VERCEL as a permanent workaround.
3. Classify retained schedules: price reads, member/payment maintenance, and trading safety. `vercel.json` schedules do not execute automatically on a plain Node.js server. Never run old and new schedulers simultaneously.
4. Inspect live trading authority and open positions read-only before any scheduler handover. No live switch, order or protection change is authorized by this assessment.
5. Confirm DNS provider access, current records/TTL, certificate issuance and rollback. Do not change DNS while staging is unverified.
6. Database/auth/storage plans, usage limits, backups, email delivery and API billing remain separate audit items. Moving web hosting does not itself cancel these bills.

## Acceptance and cutover gates

- Isolated staging, initially inaccessible publicly; no trading or paid background jobs.
- Correct asset loading, protected APIs deny anonymous/missing-secret requests, TLS and cookies correct.
- Authorized login and member visibility, price freshness, payment callback compatibility and email verification/reset checked without test purchases or unsolicited mail.
- Load/memory and database connectivity measured; backups and previous deployment retained.
- Single scheduler ownership established before DNS cutover, with explicit risk checks for trading maintenance.
- Public post-deployment validator prints UPGRADE VALIDATION PASSED; member/payment/price checks separately pass.
- Only then cancel Vercel Pro at the confirmed permissible renewal boundary. Retain export/rollback materials before losing paid-plan functionality.

## Changes in this assessment

Documentation only. No packages installed, ports opened, production variables moved, database changes, runtime starts, DNS edits or billing mutations. No code tests repeated because no runtime code changed. Rollback of this document requires no production action.
