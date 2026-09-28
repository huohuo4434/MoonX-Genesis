# Creator journal — 2026-09-29

## Scope

- Homepage: server-rendered public article feed, creator profile, original publication dates, public/member navigation.
- Member landing redirects to existing protected notes page; editor and member posts precede the public full-text archive.
- Header/mobile navigation describes a journal rather than a trading desk.
- Chinese and English interface; untranslated historical Chinese posts explicitly labelled.
- No APIs, database, environment variables, packages, payment settings, subscription changes or trading controls modified.
- Historical article bodies, charts, anchors and research routes retained.

## Deliberate boundary

The existing database composer still publishes **member-only text posts**, with optional English text, drafts and comments. This release does not claim to add public visibility selection or image uploads to that composer. Public illustrated articles remain in the versioned content catalogue. Changing that workflow requires its own access-control and storage work.

## Verification

Run `node --import tsx --test tests/creator-journal.test.ts tests/member-notes.test.ts tests/operation-desk.test.ts`, TypeScript, production build, and impact audit. Inspect Chinese/English home, old article anchors, member redirect and signed-out access in the browser. Do not post test content to production.

## Rollback

Revert only this UI/content-navigation commit and redeploy; no data rollback or migration. Preserve the existing trading retirement gate. Do not roll the whole site back to a pre-retirement deployment. Production acceptance is separate from a successful local build.
