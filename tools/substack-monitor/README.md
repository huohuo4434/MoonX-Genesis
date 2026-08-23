# MOOX Substack email monitor

This Google Apps Script forwards only new research emails whose exact sender is
`agentmat@substack.com` to the private MOOX ingestion route. It does not forward
other Gmail messages and never stores a Gmail or Substack password.

## Security boundaries

- Configure secrets only as Google Apps Script Properties.
- Use a dedicated `MOOX_SUBSTACK_INGEST_SECRET`; never reuse `CRON_SECRET`, the
  X collector secret, Bitget credentials, or database credentials.
- The website rechecks the exact sender, baseline date, subject allowlist and
  body size even though the Apps Script already filters them.
- Accepted content is stored as internal, pending-review, research-only data.
- It cannot publish a forecast, change a locked direction, or trigger trading.
- Each Gmail message ID is remembered only after the MOOX endpoint confirms
  that exact ID. A failed request or retryable rejection is retried safely, and
  database dedupe prevents duplicates. Thread-level Gmail labels are not used,
  because they could hide a later message in the same thread.
- Payloads are split below 1.75 MB before transmission; the server independently
  enforces a 2 MB request limit.

## Required Script Properties

| Name | Value |
| --- | --- |
| `MOOX_SUBSTACK_INGEST_URL` | `https://mooxintel.com/api/internal/substack-intelligence/ingest` |
| `MOOX_SUBSTACK_INGEST_SECRET` | Separate random secret, minimum 32 characters |
| `MOOX_SUBSTACK_BASELINE_ISO` | Cutover timestamp captured immediately before enabling the trigger |

Run `scanAgentMat` once for a dry operational check, then run
`installAgentMatTrigger` to create exactly one 30-minute trigger. Keep the Codex
heartbeat active through the 24-hour shadow period.
