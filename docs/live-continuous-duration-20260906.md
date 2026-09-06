# Continuous-duration runtime support (not live activation)

## September 6 production diagnosis follow-up

Production GET proved REST positions returns explicit `list:null`, while ordinary
orders and both strategy lists are empty arrays. Never coerce missing data to zero.
Only that explicit null-list case now requests an independent authenticated UTA
WebSocket position **full snapshot**. Only a fresh matching `snapshot` with `data:[]`
passes. ACK, update, null, timeout, errors or any rows fail closed. The socket closes
after this bounded read. No new environment variables, dependencies, schema changes,
permission changes or trade submission are introduced. Uses existing Bitget credentials
only against the documented official private socket. Retains all other transition gates.
Official sources: https://www.bitget.com/api-doc/uta/guide and
https://www.bitget.com/api-doc/uta/websocket/private/Positions-Channel .
WS login uses integer seconds, matching the official V3 Node SDK, despite the
guide prose saying milliseconds. Position snapshot timestamps remain milliseconds.
SDK: https://github.com/BitgetLimited/v3-bitget-api-sdk/blob/master/bitget-node-sdk-api/src/lib/ws/BitgetWsClient.ts .

Rollback before conversion: revert the diagnostic/fallback commits, retaining data.
Do not use a pre-continuous-duration runtime after a user has converted duration.

Scope: duration/transition core, Bitget reader/synchronizer and runtime DTO, admin
readiness API, explicit continuous-duration POST and UI, member desk status,
admin snapshot/UI, tests and additive SQL migration. Outbox open retries now
recheck current authority and entry epoch before configure/submit. No new environment
variables, risk-limit changes, forecast changes or automatic account-mode changes.
The transition itself only reads the exchange; it never submits an order.

The applied database row owns `duration_mode`. Missing mode is legacy `FIXED`.
`CONTINUOUS` requires an explicit value, valid non-future start, ACTIVE status and
NULL deadline. An absent deadline alone is never authority. All existing security,
daily-loss, drawdown and entry gates still apply. A pending configuration event
does not count as an applied runtime setting.

## Release and activation boundaries

- This migration adds FIXED-default duration_mode and nullable entry_epoch_at columns. It does not renew COMPLETED
  experiments or clear STOPPED states, expiry dates, loss history or stop reasons.
- Code tolerates the old schema on read via to_jsonb; missing mode stays FIXED.
- The existing production record is COMPLETED. Deploying this code does **not**
  make it active. The saved configuration remains pending.
- Implemented POST /api/admin/live-trading/continuous-duration with administrator,
  same-origin JSON and exact-confirmation checks. Its user-clicked button only
  prepares continuous duration, never chains SET_MODE LIVE.
- The transaction requires MANAGE_ONLY + new entries disabled + management enabled;
  a completely released runtime lease; no unresolved outbox work, active decisions
  or live slices; strict empty exchange evidence; current daily opening equity;
  and a FIXED/COMPLETED record whose stop reason is specifically expiry.
- Original capital, started_at, peak equity, cumulative/daily P&L and drawdowns
  remain intact. Risk breaches and unknown evidence block. Original evidence is
  recorded in the same transaction. The pending capital/leverage draft is not applied.
- Conversion sets an entry epoch. Old or missing decision evidence cannot open a
  new position. Synchronizer status/mode CAS prevents an old fixed-duration read
  from overwriting a newly converted record. Repeating a successful conversion
  does not reset history. Database concurrency has not been live-tested.
- Historical preparation stopped at a Vercel connector 403. On September 6 the
  configured Vercel CLI successfully inspected the production project, so the
  earlier connector error is not a current CLI deployment blocker.
- The additive migration has now been applied through the configured Supabase
  connection and verified. The existing row remains FIXED/COMPLETED with its
  original deadline and no entry epoch. No lifecycle conversion or live switch
  has been performed. The stored account permission is LIVE, but expiry blocks
  entries; the administrator must turn off new entries before conversion.
- Merge with origin/main preserves strict current USDT equity reads and routes
  the shared period evaluator through the continuous-duration evaluator.
- Before conversion, verify every scheduler calls the new production alias or
  uses an upgraded worker; allow old in-flight synchronizers to finish. Never
  roll back to a pre-CONTINUOUS synchronizer after applying continuous duration.

## Rollback

Before any future continuous activation, rollback is code-only: retain the additive
column and all data. After a continuous account exists, an old application cannot
interpret its NULL deadline; reverting then requires a separately reviewed pause
and compatibility plan, not dropping data or resetting the account.

## Validation

Run targeted duration/admin/member publisher tests, typecheck, production build
and impact audit. Require separate Reviewer approval. Production acceptance remains
separate and requires `UPGRADE VALIDATION PASSED` plus fresh read-only runtime proof.

Previous preparation had combined targeted result 143/143 PASS, TypeScript PASS
and production build PASS. Current merged code: targeted tests 57/57 PASS;
separate Reviewer independently reran 57/57 and approved. Merged production build
and typecheck passed; pretest passed 3 market-session and 61 safety tests. Store, route, UI and actual
reader/synchronizer tests mock database/exchange/HTTP boundaries; these are not
proof of a production conversion. No production acceptance has been claimed.
An independent extra historical public-verification test has an unrelated existing
`starBreakdown` static assertion failure. These results are not an all-repository pass.
