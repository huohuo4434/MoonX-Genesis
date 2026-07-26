# MoonX Research Update Workflow

MoonX research content is curated in a single JSON file. The website does **not** invent forecast numbers in React components.

## Single source of truth

| Path | Role |
|------|------|
| `content/moonx/latest.json` | Current live research document |
| `content/moonx/history/*.json` | Immutable historical snapshots |
| `content/moonx/source-notes/*.md` | Human notes for editors |
| `lib/moonx/load-research.ts` | `loadMoonXResearch()` — only allowed loader |
| `lib/moonx/schema.ts` | Zod schema / validation contract |
| `lib/moonx/score-engine.ts` | MoonX Weighted Research Score |
| `lib/moonx/rating-engine.ts` | Rating labels + listing activation rules |

Do **not** import JSON independently inside components. Always go through `loadMoonXResearch()` (or the `lib/data/*` accessors that wrap it).

---

## Exact update process

1. **Edit** `content/moonx/latest.json`
2. **Validate**  
   ```bash
   npm run moonx:validate
   ```
3. **Snapshot** (after validation passes; bumps must use a new `version`)  
   ```bash
   npm run moonx:snapshot
   ```
4. **Run the app**  
   ```bash
   npm run dev
   ```
5. **Check homepage** `/`
6. **Check Research Intelligence** `/research/intelligence-snapshot`
7. **Switch every language** (简体中文 / 繁體中文 / English) and confirm labels update
8. **Quality gates**  
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
9. **Commit** `latest.json`, the new history snapshot, and any source notes together

---

## Weight calculation formula

Each framework factor has:

- `directionScore` ∈ [-100, 100]
- `weight` ∈ [0, 100]
- `confidence` ∈ [0, 100]

```
contribution = directionScore × (weight/100) × (confidence/100)
calculatedScore = clamp( sum(contribution) / sum((weight/100)×(confidence/100)) , -100, 100)
```

Label this in the UI as **MoonX Weighted Research Score** — not a statistically proven probability.

### Rating map

| Score | Rating |
|------:|--------|
| 61…100 | Strong Bullish |
| 26…60 | Bullish |
| -25…25 | Neutral |
| -60…-26 | Bearish |
| -100…-61 | Strong Bearish |

### Scenario weights

`scenarioWeights.base + bull + bear` must equal **100**.  
They are research scenario weights, not mathematical probabilities. The loader normalizes them defensively.

---

## Example: updating a BTC opinion

1. Open `content/moonx/latest.json` and find `"id": "bitcoin"`.
2. Change the Macro Liquidity Rotation factor, for example:
   ```json
   {
     "id": "btc-macro-liquidity-rotation",
     "framework": "Macro Liquidity Rotation",
     "directionScore": 60,
     "weight": 20,
     "confidence": 75,
     "status": "Partially Confirmed",
     "explanation": { "zhCN": "...", "zhTW": "...", "en": "..." }
   }
   ```
3. If the overall view changed, update `localizedSummary`, `status`, and `scenarioWeights` (still totaling 100).
4. Bump document fields:
   ```json
   "version": "2026-08-03-v1",
   "snapshotId": "2026-08-03-v1",
   "lastUpdated": "2026-08-03T10:00:00.000Z"
   ```
5. Run:
   ```bash
   npm run moonx:validate
   npm run moonx:snapshot
   npm run dev
   ```
6. Confirm BTC cards, scenario chart levels, and consensus score on `/` and `/research/intelligence-snapshot`.
7. Run lint / tsc / build, then commit.

---

## ChangXin listing activation rule

When `strategicWatchlistSettings.listingStatus` is manually changed from `preIPO` → `listed` and `activateOnListing` is `true`, the active rating becomes **Bullish** with label **New Listing Bullish Watch**.

Do not invent a `listingDate` unless it is verified. Prefer `null`.

Implied market capitalization is calculated only when both `ipoPrice` and `totalShares` are present.

---

## History rules

- Never overwrite an existing `content/moonx/history/<version>.json`
- Always bump `version` before `npm run moonx:snapshot`
- Keep `latest.json` as the editable working copy
