/**
 * Kept as a compatibility entry point for old release jobs.
 *
 * Production builds must be reproducible and side-effect free. Database
 * migrations, seeds, review jobs, membership checks and email tests belong to
 * explicit release/operations commands, never to `next build`.
 */
console.log("[postbuild] no-op: production build side effects are disabled");
