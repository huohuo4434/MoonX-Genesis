/**
 * One-shot production cycle runner.
 * Registers an empty server-only shim before importing app modules.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Map `server-only` to empty shim for this process
try {
  const { register: registerHook } = await import("node:module");
  void registerHook;
} catch {
  /* ignore */
}

// tsx-friendly: mutate Module resolution via NODE_OPTIONS alternative — use require.cache inject
const Module = require("node:module") as typeof import("node:module") & {
  _resolveFilename: (request: string, parent: unknown, isMain: boolean, options: unknown) => string;
};
const orig = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options: unknown) {
  if (request === "server-only") {
    return require.resolve("./shims/server-only.ts");
  }
  return orig.call(this, request, parent, isMain, options);
};

import { loadProductionEnv } from "./load-env";

async function main() {
  loadProductionEnv();
  const { runMoonxCycle } = await import("../lib/automation/cycle");
  const report = await runMoonxCycle();
  console.log(
    JSON.stringify(
      {
        ok: true,
        beijingDate: report.beijingDate,
        forecastCreated: report.forecastCreated ?? 0,
        verified: report.verified ?? 0,
        reviewsCreated: report.reviewsCreated ?? 0,
        casesTotal: report.casesTotal ?? 0,
        tasks: report.tasks.map((t) => ({
          runKey: t.runKey,
          status: t.status,
          message: t.message,
        })),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
