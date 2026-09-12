# Free picks: bounded editorial release

Public landing: `/free-picks` and `/en/free-picks`. No payment or account is required to read the selected research. Signup leads back here. Existing paid entitlements and execution controls are unchanged.

The first release is pending. Empty means no trade, not a fabricated example. Review every 72 hours; publish at most one qualifying pick per 72 hours. Skip if no source is complete. The page reports an overdue check rather than extending an expired plan.

## Publication

- Edit only `content/free-picks/catalog.json` for each editorial round. Update `lastCheckedAt` and a bilingual factual `checkNote` after actually checking. Append picks and reviews; never edit or remove a published pick or review to improve its result. Correct an error in a new, linked release, preserving the original.
- Use current formally published/locked MOOX plans with verified original source, exact instrument/venue/currency, actual closed candles, matching timeframe, and a future observation start. Do not publish private paid-group wording or personal/account data. Never copy all internal source records to this public catalog. `sourceRef` is an internal trace pointer, not rendered.
- Verify technical confirmation, liquid instrument, market calendar, executable entry zone, invalidation, stop and targets. Do not generate prices merely to fill fields. Source publication and lock precede release; release precedes observation. No past returns may influence selection. Stars are consensus, not accuracy.
- Schema checks worst-zone-entry risk/reward >= 2 to target 1 after estimated round-trip cost per unit, geometry, chronology, IDs and spacing. These mechanical checks do NOT establish suitability or profitability. There is no live quote/stop monitoring; tell readers to check the named venue and conditions. Never claim this creates or triggers a Bitget order.
- `publishedAt` must reflect actual first public availability, not just a source timestamp or commit time. Choose `validFrom` with ample deployment margin. Verify production is live BEFORE validFrom; if deployment misses that deadline, do not count it as a prospective observation. Keep the incident visible and cancel that release; never backdate it.
- Reviews are separate appended objects, one final review per completed observation window, with evidence URL and bilingual explanation. Outcomes: TARGET, STOP, PARTIAL, NOT_TRIGGERED, CANCELLED. If entry and stop/target occur in the same candle, require finer data or state ambiguity; do not assign the favorable order. Report all entries, fees, slippage and denominator before any performance statistic. Waiting/empty checks are not trade samples.
- Validate with `node --conditions=import --import tsx --test tests/free-picks.test.ts tests/free-research-example.test.ts tests/public-bilingual-welcome.test.ts`, TypeScript, build, impact audit and production validator. Review diff to prove old picks/reviews are unchanged. Commit/deploy only scoped files, and verify anonymous Chinese/English pages before announcing.

## Recurring owner

Existing Codex heartbeat `moox-ai` checks this editorial round when the catalog check is at least 72 hours old. It is a local scheduled follow-up, not a new VPS collector. No duplicate polling, new paid service or database is needed. If source access or deployment is unavailable, skip safely and report a meaningful failure; no credential extraction or permission bypass.

X announcement uses one public landing URL with UTM and only actually deployed features. First pick pending must not be advertised as an available profitable trade. Do not claim users can earn by following the page.
