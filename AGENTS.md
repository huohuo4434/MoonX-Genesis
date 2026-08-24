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
- AI conclusions may inform risk and execution, but may not set or reverse the locked direction and may not bypass hard risk controls.
- Builder and reviewer must be separate.

## 3. Prediction integrity

- Never rewrite a locked historical forecast after the outcome is known.
- Preserve failed and partial-hit samples.
- Star rating means method consensus, not direction or return magnitude.
- Liuyao and Qimen evidence must remain traceable to the supplied notes.
- Qimen is a timing aid; do not invent a use-god or a missing chart.

## 4. Prediction governance (source-locked)

- Higher-horizon readings define market context; the active weekly/stage Liuyao record owns the official short/medium direction.
- Do not require or fabricate a daily hexagram. Daily analysis is derived from the active weekly/stage record and market calendar.
- Qimen refines timing only. Chan/technical analysis provides structure, levels, entry, stop and risk/reward only.
- Technical, macro, news, analyst, AI and quant layers may delay, resize or block execution; none may reverse a locked direction.
- Public official direction uses only: 上涨、震荡上涨、先跌后涨、震荡、先涨后跌、震荡下跌、下跌.
- Keep direction, probability, consensus stars, risk level and execution status as separate fields.
- Top-5 selection requires direction, valid technical location, acceptable risk/reward and a current-week window. Bearish A-share calls are risk notes, not actionable Top-5 entries.
- Locked publications are immutable. Any change requires a new version, revision reason and preserved history.
- Liuyao source priority is conditional before publication: complete same-window Bingwu/Wolf teacher readings have a soft 55:45 priority over a complete user-cast reading interpreted with the teacher method. If and only if a valid same-window Qimen reading, a strict majority of at least three independent approved analysts, and a complete Chan structure all align with the user Liuyao path, the user Liuyao becomes the official pre-publication direction while the teacher disagreement remains visible.
- Qimen, analysts and Chan never set the official direction directly. They only arbitrate between two complete conflicting Liuyao candidates before lock. Missing, stale, retrospective, duplicated or cross-horizon evidence cannot satisfy the exception.

## 5. Verification gates

A change is not complete until:

- targeted tests pass;
- TypeScript passes;
- Next.js production build passes;
- changed API routes have the correct authorization check;
- new environment variables are documented;
- database schema changes include a migration;
- the impact report contains no blocker.

Do not claim production success unless the installer prints `UPGRADE VALIDATION PASSED`.

## 6. MOOX research committee

The internal committee uses five independent Builder roles and one separate Reviewer:

1. Market Structure
2. Liuyao and Qimen
3. Macro and Events
4. Contrarian
5. Risk
6. Final Reviewer

Committee output is `RESEARCH_ONLY`. It never directly triggers Bitget orders or automatically overwrites published forecasts.
