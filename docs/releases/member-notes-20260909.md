# Member notes and discussions

Scope: `/member/notes` (+ `/en/member/notes` rewrite), `/api/member/notes`, member/admin navigation; isolated `member_notes` and `member_note_replies` tables. No official forecasts, metrics, trading, credentials or environment changes.

Permissions: signed-out users sign in; free/expired users receive database-generated previews only (title and first line, capped at 120 characters per language). Paid users/admins pass the existing fresh membership/device guard for full posts and replies. Admin publishes/moderates. Members may withdraw only their own replies. No emails or raw author IDs are returned. Plain text only, React-escaped; JSON same-origin writes, body limits, request throttling, database-backed reply cooldown and idempotency.

Lifecycle: drafts, published posts, archived posts. Archive/hide is reversible by admin. No automatic publication, AI translation, subscriptions, polling, notification service or extra paid integration. Admin sees a first-line preview before publishing. English fields are optional; untranslated content is labeled honestly.

Migration: apply only `supabase/migrations/20260908223940_member_notes_and_replies.sql` to the verified MOOX project, not all historical migrations. RLS enabled, direct anon/authenticated grants revoked; explicit service role grants. Functions use invoker security and a fixed search path. Test inside a rollback transaction before publishing any genuine member content.

Rollback: revert this release's app commit/deployment. Leave additive tables in place to preserve posts/replies; do not drop member data. No runtime trading switch or environment variable to restore.

Acceptance: targeted tests, TypeScript, production build, independent review, migration/grants checks, authenticated admin draft/reply path and free-preview/full-member authorization verification. Installer acceptance marker may be printed only after these checks, not merely after a build.
