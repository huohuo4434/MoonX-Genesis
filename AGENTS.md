# MOOX Agent Workbench Rules

These instructions apply to all coding and review work in this repository.

## 1. Before editing

1. Run `RUN_MOOX_IMPACT_AUDIT.cmd` or `node tools/moox-workbench/moox-impact-audit.mjs`.
2. When code-review-graph is installed, update the graph before making changes.
3. State the exact scope: files, APIs, database, environment variables, tests and rollback.
4. Do not modify unrelated files to make a change look successful.

## 2. High-risk areas

Changes under these paths are high risk and require explicit tests plus a reviewer pass:

- `lib/bitget/**`
- `lib/trading-signals/**`
- `app/api/cron/**`
- `app/api/admin/**`
- `lib/auth/**`
- `lib/payments/**`
- `prisma/**`

For live trading changes:

- Never turn live execution on or off implicitly.
- Demo requests may use `paptrading: "1"`; live requests must not.
- Preserve leverage, position, daily-loss, drawdown and protection-order limits.
- AI conclusions may inform direction but may not bypass hard risk controls.
- Builder and reviewer must be separate.

## 3. Prediction integrity

- Never rewrite a locked historical forecast after the outcome is known.
- Preserve failed and partial-hit samples.
- Star rating means method consensus, not direction or return magnitude.
- Liuyao and Qimen evidence must remain traceable to the supplied notes.
- Qimen is a timing aid; do not invent a use-god or a missing chart.

## 4. Verification gates

A change is not complete until:

- targeted tests pass;
- TypeScript passes;
- Next.js production build passes;
- changed API routes have the correct authorization check;
- new environment variables are documented;
- database schema changes include a migration;
- the impact report contains no blocker.

Do not claim production success unless the installer prints `UPGRADE VALIDATION PASSED`.

## 5. MOOX research committee

The internal committee uses five independent Builder roles and one separate Reviewer:

1. Market Structure
2. Liuyao and Qimen
3. Macro and Events
4. Contrarian
5. Risk
6. Final Reviewer

Committee output is `RESEARCH_ONLY`. It never directly triggers Bitget orders or automatically overwrites published forecasts.
