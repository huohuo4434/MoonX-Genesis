# MOOX AI Workbench Phase 1

## Included

1. Local code intelligence setup using the official `code-review-graph` package.
2. A deterministic impact audit that maps changed files to risk areas and required tests.
3. Project-level agent rules in `AGENTS.md`.
4. Five independent research Builder roles and one separate Reviewer.
5. Admin page: `/admin/ai-committee`.
6. Input and output verification gates, evidence labels, uncertainty limits and no-direct-trading policy.

## Local setup

Run:

```text
SETUP_MOOX_CODE_GRAPH.cmd
```

This installs `code-review-graph` locally with Python, configures Codex without overwriting `AGENTS.md`, and builds the first graph. It is a development tool only and is not deployed to Vercel.

Before a future upgrade run:

```text
RUN_MOOX_IMPACT_AUDIT.cmd
```

The report is written to:

```text
.moox-workbench/impact-report.md
.moox-workbench/impact-report.json
```

## Research committee

The page uses the existing `OPENAI_API_KEY`. Optional model override:

```text
MOOX_COMMITTEE_MODEL=gpt-4o-mini
```

If `MOOX_COMMITTEE_MODEL` is absent, the existing `OPENAI_MODEL` is used. No new environment variable is required when the current OpenAI setup already works.

The committee requires at least two independent evidence groups and a market or technical anchor. It performs two model calls:

1. Builder call: five independent roles.
2. Reviewer call: evidence review, disagreement preservation, invalidation and publishing decision.

The output remains internal. `APPROVED` means eligible for human publishing, not automatic publication and never automatic trading.
