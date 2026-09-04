# Runtime duration and budget requests

The administrator page offers CONTINUOUS (no proposed calendar expiry) or FIXED
(1–36525 days) and a positive USDT budget, with at most two decimal places and
an exact, safe-integer cent representation. It also offers a 1x or 2x maximum
leverage; 2x remains the official hard ceiling and older drafts read as the
existing 2x default. Neither duration nor budget is fixed at 30 days/1000U
in this **pending configuration**.

GET/POST `/api/admin/live-trading/configuration-draft` require an administrator;
POST additionally requires same-origin JSON. GET never writes. POST accepts
only draft, expectedRevision and a v4 UUID requestId. It appends an INFO
`LIVE_CONFIGURATION_DRAFT_V1` event to the existing official account's
MooxUnifiedLiveEvent ledger; actor and previous revision stay internal.
The account row is locked to serialize writers, but is not updated. Stale
revision conflicts return 409; identical idempotency retries reuse one event.
Event creation and revision check share one transaction. No new schema or
environment variables are introduced. There is no event purge for this code.
The existing account-delete cascade still applies; this is an append-only
application workflow, not a database-enforced undeletable archive.

This is not an effective trading configuration. No runtime, order submission,
outbox retry, experiment row, equity baseline, current budget, account mode,
leverage or loss limit consumes or changes from this draft. Public/member
forecast and trading systems are not changed. Saving cannot restore an expired
experiment. The browser deliberately never chains a save into SET_MODE or a
renewal action; no automatic save occurs on page load.

Before implementing activation: bind a specific saved revision to explicit
user confirmation, fence experiment sync/old expiry exits/outbox final submits
by generation, strictly check current exchange evidence, and retain original
equity/peak/loss baselines. Requested budget must be bounded by available funds
and existing risk constraints; it is not a request to reset them. Current
1000U authority and the expired historical experiment remain unchanged.

Rollback: revert this code commit. Existing events remain for audit and are
ignored by execution. Do not delete them or overwrite the original experiment.
Tests: live-trading-configuration-draft*.test.*, admin-live-two-buttons.test.mjs.

The read-only renewal preview now reads this saved revision instead of proposing
30 days unconditionally. CONTINUOUS has no proposed end date; FIXED uses the
saved 1–36525 days. The requested USDT amount is shown separately from equity.
Missing, invalid, future-dated or unreadable settings produce UNKNOWN, not a
default duration or budget. The configuration row's OK confirms format only;
canRenew remains false. Reopen the preview after editing settings to refresh
its dated snapshot. This preview change still does not implement activation.
