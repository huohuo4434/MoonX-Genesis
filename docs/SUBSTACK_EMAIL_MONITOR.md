# Substack Email Monitor

This integration receives only messages from the exact publication sender
`agentmat@substack.com` through a dedicated Google Apps Script. It stores the
message as internal, anonymous, pending-review research under the public label
`周期预测师`.

## Server configuration

- `MOOX_SUBSTACK_INGEST_SECRET`: server-only bearer secret for
  `/api/internal/substack-intelligence/ingest`. Use at least 32 characters and
  do not reuse `CRON_SECRET`, `MOOX_X_COLLECTOR_SECRET`, database credentials,
  or any Bitget secret.
- `MOOX_EXTERNAL_ANALYST_ENABLED`, `MOOX_EXTERNAL_ANALYST_FEED_URL`,
  `MOOX_X_WATCH_ACCOUNTS`, and `X_BEARER_TOKEN` continue to belong to the
  separate X intelligence collector. The Substack monitor does not read or
  reuse them.

## Safety boundary

- Stored email is `RESEARCH_ONLY`, internal and pending human review.
- It is explicitly excluded from external-analyst trading overlay queries.
- It cannot set or reverse the locked forecast direction, rewrite historical
  predictions, or trigger Bitget orders.
- Keep the existing Codex monitor active during a 24-hour shadow comparison.
  Disable it only after the server path has demonstrated complete delivery and
  deduplication.

The Apps Script setup and required Script Properties are documented in
`tools/substack-monitor/README.md`.
