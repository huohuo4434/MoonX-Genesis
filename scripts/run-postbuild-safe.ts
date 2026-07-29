import { execSync } from "node:child_process";

const steps = [
  ["bootstrap", "node --import tsx scripts/run-bootstrap-if-requested.ts"],
  ["seed-weekly-liuyao", "node --import tsx scripts/seed-weekly-liuyao-sources.ts"],
  ["seed-iching-if-present", "node --import tsx scripts/run-if-exists.ts scripts/seed-iching-engine.ts"],
] as const;

for (const [label, command] of steps) {
  console.log(`[postbuild] ${label}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(
      `[postbuild] ${label} failed but will not block deployment:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
